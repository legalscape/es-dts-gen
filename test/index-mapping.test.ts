import { IndexMapping, IndexMappingBuilder, IndexMappingField, IndexMappingNestedField } from '../src/index-mapping';
import { Client } from '@elastic/elasticsearch';
import { FieldTypeSpec } from '../src/type-spec';

let indexMappings: IndexMapping[];

describe('IndexMappingBuilder', () => {
  beforeAll(async () => {
    const client = new Client({ node: 'http://localhost:9299/' });
    indexMappings = await new IndexMappingBuilder(client).build();
  });

  test('# of indices', () => {
    expect(indexMappings.length).toBe(2);
  });

  function testField(
    indexName: string,
    fieldName: string,
    fn: (field: IndexMappingField | IndexMappingNestedField) => void
  ): void {
    test(`Field: ${fieldName}`, () => {
      const mapping: IndexMapping = indexMappings.filter((mapping) => mapping.name === indexName)[0];
      const field = mapping.fields.filter((f) => f.name === fieldName)[0];

      expect(field).toEqual(expect.anything());

      fn(field);
    });
  }

  function testNestedField(
    indexName: string,
    fieldName: string,
    nestedFieldName: string,
    fn: (field: IndexMappingField | IndexMappingNestedField) => void
  ): void {
    test(`Nested field: ${fieldName}.${nestedFieldName}`, () => {
      const mapping: IndexMapping = indexMappings.filter((mapping) => mapping.name === indexName)[0];
      const field = mapping.fields.filter((f) => f.name === fieldName)[0] as IndexMappingNestedField;
      const nestedField = field.fields.filter((f) => f.name === nestedFieldName)[0];

      expect(nestedField).toEqual(expect.anything());

      fn(nestedField);
    });
  }

  describe('Index: index-test-1', () => {
    test('# of fields', () => {
      const mapping: IndexMapping | undefined = indexMappings.filter((mapping) => mapping.name === 'index-test-1')[0];
      expect(mapping?.fields?.length).toBe(8);
    });

    testField('index-test-1', 'number_int_nonnull_mandatory', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, false, false));
    });

    testField('index-test-1', 'number_long_nullable', (field) => {
      expect(field.type).toBe('long');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, true, false));
    });

    testField('index-test-1', 'number_float_optional', (field) => {
      expect(field.type).toBe('float');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, false, true));
    });

    testField('index-test-1', 'number_double_nullable_optional', (field) => {
      expect(field.type).toBe('double');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, true, true));
    });

    testField('index-test-1', 'date_array_nonnull_mandatory', (field) => {
      expect(field.type).toBe('date');
      expect(field.spec).toEqual(new FieldTypeSpec(false, true, false, false));
    });

    testField('index-test-1', 'boolean_array_nullable', (field) => {
      expect(field.type).toBe('boolean');
      expect(field.spec).toEqual(new FieldTypeSpec(false, true, true, false));
    });

    testField('index-test-1', 'keyword_array_optional', (field) => {
      expect(field.type).toBe('keyword');
      expect(field.spec).toEqual(new FieldTypeSpec(false, true, false, true));
    });

    testField('index-test-1', 'text_array_nullable_optional', (field) => {
      expect(field.type).toBe('text');
      expect(field.spec).toEqual(new FieldTypeSpec(false, true, true, true));
    });
  });

  describe('Index: index-test-2', () => {
    test('# of fields', () => {
      const mapping: IndexMapping | undefined = indexMappings.filter((mapping) => mapping.name === 'index-test-2')[0];
      expect(mapping?.fields?.length).toBe(2);
    });

    testField('index-test-2', 'nested', (field) => {
      expect(field.type).toBe('nested');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, false, false));
      expect((field as IndexMappingNestedField).fields.length).toBe(5);
    });

    testNestedField('index-test-2', 'nested', 'nested_field_nonnull_mandatory', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, false, false));
    });

    testNestedField('index-test-2', 'nested', 'nested_field_nullable', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, true, false));
    });

    testNestedField('index-test-2', 'nested', 'nested_field_optional', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, false, true));
    });

    testNestedField('index-test-2', 'nested', 'nested_field_nullable_optional', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(true, false, true, true));
    });

    testNestedField('index-test-2', 'nested', 'nested_field_array', (field) => {
      expect(field.type).toBe('integer');
      expect(field.spec).toEqual(new FieldTypeSpec(false, true, false, false));
    });
  });
});
