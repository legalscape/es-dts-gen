import { Client } from '@elastic/elasticsearch';
import {
  FieldDataType,
  FieldDefinition,
  FieldDefinitionNested,
  IndicesGetMappingResponse,
  IndicesStatsResponse,
} from './es/indices';
import { FieldTypeSpec } from './type-spec';
import { FieldInspector } from './field-inspector';

export class IndexMappingField {
  readonly name: string;
  readonly type: FieldDataType;
  readonly spec: FieldTypeSpec;

  constructor(name: string, definition: FieldDefinition, spec: FieldTypeSpec) {
    this.name = name;
    this.type = definition.type;
    this.spec = spec;
  }
}

export class IndexMappingNestedField extends IndexMappingField {
  readonly fields: Array<IndexMappingField | IndexMappingNestedField>;

  constructor(
    name: string,
    definition: FieldDefinitionNested,
    spec: FieldTypeSpec,
    fields: Array<IndexMappingField | IndexMappingNestedField>
  ) {
    super(name, definition, spec);
    this.fields = fields;
  }
}

/**
 * Represents index mapping.
 */
export class IndexMapping {
  readonly name: string;
  readonly fields: Array<IndexMappingField | IndexMappingNestedField>;

  constructor(name: string, fields: Array<IndexMappingField | IndexMappingNestedField>) {
    this.name = name;
    this.fields = fields;
  }
}

/**
 * Builder class for IndexMapping.
 */
export class IndexMappingBuilder {
  readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Builds IndexMapping objects of all indices.
   */
  async build(): Promise<IndexMapping[]> {
    const result: IndexMapping[] = [];

    for (const indexName of await this.listIndexNames()) {
      result.push(await this.buildIndexMapping(indexName));
    }

    return result;
  }

  /**
   * Returns list of index names in the Elasticsearch cluster.
   */
  async listIndexNames(): Promise<string[]> {
    const response = await this.client.indices.stats<IndicesStatsResponse>();
    return Object.keys(response.body.indices);
  }

  /**
   * Builds IndexMapping object of the index.
   *
   * @param indexName Name of the index.
   */
  async buildIndexMapping(indexName: string): Promise<IndexMapping> {
    const definitions = await this.fetchFieldDefinitions(indexName);
    const fields = await new IndexMappingFieldBuilder(this.client, indexName).build(definitions);

    return new IndexMapping(indexName, fields);
  }

  /**
   * Fetches field definitions of the index.
   *
   * @param indexName Name of the index.
   */
  async fetchFieldDefinitions(
    indexName: string
  ): Promise<{ [fieldName: string]: FieldDefinition | FieldDefinitionNested }> {
    const response = await this.client.indices.getMapping<IndicesGetMappingResponse>({ index: indexName });
    return response.body[indexName].mappings.properties;
  }
}

/**
 * Builder class for IndexMappingField.
 */
class IndexMappingFieldBuilder {
  readonly client: Client;
  readonly indexName: string;
  readonly fieldInspector: FieldInspector;

  constructor(client: Client, indexName: string) {
    this.client = client;
    this.indexName = indexName;
    this.fieldInspector = new FieldInspector(client, indexName);
  }

  /**
   * Builds IndexMappingField objects from field definitions.
   *
   * @param definitions definitions of the fields in the index.
   * @param ancestors ancestor field names if the field is nested.
   */
  async build(
    definitions: {
      [fieldName: string]: FieldDefinition | FieldDefinitionNested;
    },
    ancestors: string[] = []
  ): Promise<Array<IndexMappingField>> {
    const result: Array<IndexMappingField> = [];

    for (const [fieldName, definition] of Object.entries(definitions)) {
      const spec = await this.fieldInspector.inspect(fieldName, ancestors);

      if (this.isFieldDefinitionNested(definition)) {
        const children = definition.properties
          ? await this.build(definition.properties, [...ancestors, fieldName])
          : [];
        result.push(new IndexMappingNestedField(fieldName, definition, spec, children));
      } else {
        result.push(new IndexMappingField(fieldName, definition, spec));
      }
    }

    return result;
  }

  isFieldDefinitionNested(definition: FieldDefinition | FieldDefinitionNested): definition is FieldDefinitionNested {
    return definition.type === 'nested';
  }
}
