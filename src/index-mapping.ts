import { Client } from '@elastic/elasticsearch';
import {
  FieldDataType,
  FieldDefinition,
  FieldDefinitionNested,
  IndicesGetMappingResponse,
  IndicesStatsResponse
} from "./es/indices";

export class IndexMappingField {
  readonly name: string;
  readonly type: FieldDataType;

  constructor(name: string, definition: FieldDefinition) {
    this.name = name;
    this.type = definition.type;
  }
}

export class IndexMappingNestedField extends IndexMappingField {
  fields: Array<IndexMappingField | IndexMappingNestedField>;

  constructor(name: string, definition: FieldDefinitionNested) {
    super(name, definition);
    this.fields = definition.properties ? IndexMappingNestedField.buildFields(definition.properties) : [];
  }

  static buildFields(definitions: {
    [fieldName: string]: FieldDefinition | FieldDefinitionNested;
  }): Array<IndexMappingField | IndexMappingNestedField> {
    return Object.entries(definitions).map(([fieldName, definition]) => {
      return definition.type === 'nested'
        ? new IndexMappingNestedField(fieldName, definition as FieldDefinitionNested)
        : new IndexMappingField(fieldName, definition);
    });
  }
}

export class IndexMapping {
  readonly name: string;
  readonly fields: Array<IndexMappingField | IndexMappingNestedField>;

  constructor(name: string, fields: Array<IndexMappingField | IndexMappingNestedField>) {
    this.name = name;
    this.fields = fields;
  }

  static async getIndexMappings(node: string): Promise<Array<IndexMapping>> {
    const client = new Client({ node });
    const indicesStatsResult = await client.indices.stats<IndicesStatsResponse>();
    const indexNames = Object.keys(indicesStatsResult.body.indices);

    const result = indexNames.map((name) => IndexMapping.getIndexMapping(client, name));
    return Promise.all(result);
  }

  static async getIndexMapping(client: Client, indexName: string): Promise<IndexMapping> {
    const indicesGetMappingResult = await client.indices.getMapping<IndicesGetMappingResponse>({ index: indexName });
    const response = indicesGetMappingResult.body[indexName];

    return new IndexMapping(indexName, IndexMappingNestedField.buildFields(response.mappings.properties));
  }
}
