import { Client } from '@elastic/elasticsearch';

type FieldDataType =
  | FieldDataTypeCommon
  | FieldDataTypeObject
  | FieldDataTypeStructured
  | FieldDataTypeAggregate
  | FieldDataTypeTextSearch
  | FieldDataTypeDocumentRanking
  | FieldDataTypeSpatial
  | undefined;

type FieldDataTypeCommon =
  | 'binary'
  | 'boolean'
  | FieldDataTypeKeyword
  | FieldDataTypeNumber
  | FieldDataTypeDate
  | 'alias';

type FieldDataTypeKeyword = 'keyword' | 'constant_keyword' | 'wildcard';

type FieldDataTypeNumber = 'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'scaled_float';

type FieldDataTypeDate = 'date' | 'date_nanos';

type FieldDataTypeObject = 'object' | 'flattened' | 'nested' | 'join';

type FieldDataTypeStructured = FieldDataTypeRange | 'ip' | 'murmur';

type FieldDataTypeRange = 'integer_range' | 'float_range' | 'long_range' | 'double_range' | 'date_range' | 'ip_range';

type FieldDataTypeAggregate = 'histogram';

type FieldDataTypeTextSearch = 'text' | 'annotated-text' | 'completion' | 'search_as_you_type' | 'token_count';

type FieldDataTypeDocumentRanking = 'dense_vector' | 'rank_feature' | 'rank_features';

type FieldDataTypeSpatial = 'geo_point' | 'geo_shape' | 'point' | 'shape';

interface FieldDefinition {
  type: FieldDataType;
}

interface FieldDefinitionNested extends FieldDefinition {
  type: 'nested';
  properties:
    | undefined
    | {
        [fieldName: string]: FieldDefinition | FieldDefinitionNested;
      };
}

interface IndicesStatsResponse {
  indices: {
    [indexName: string]: Record<string, unknown>;
  };
}

interface IndicesGetMappingResponse {
  [indexName: string]: {
    mappings: {
      properties: {
        [fieldName: string]: FieldDefinition | FieldDefinitionNested;
      };
    };
  };
}

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
