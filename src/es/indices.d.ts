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
      properties?: {
        [fieldName: string]: FieldDefinition | FieldDefinitionNested;
      };
    };
  };
}

export { FieldDataType, FieldDefinition, FieldDefinitionNested, IndicesGetMappingResponse, IndicesStatsResponse };
