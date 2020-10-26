import {IndexMapping, IndexMappingField, IndexMappingNestedField} from '../src/index-mapping';

const node = 'http://localhost:9299/';

test('IndexMapping', async () => {
  const indexMappings = await IndexMapping.getIndexMappings(node);
  expect(indexMappings.length).toBe(1);

  const indexTest1 = indexMappings.filter((mapping) => mapping.name === 'index-test-1')[0];
  expect(indexTest1).toEqual(expect.anything());
  expect(indexTest1.fields.length).toBe(8);

  function fetchField(fieldName: string): IndexMappingField | IndexMappingNestedField | undefined {
    return indexTest1.fields.filter((f) => f.name === fieldName)[0];
  }

  expect(fetchField('number_int_nonnull_mandatory')?.type).toEqual('integer');
  expect(fetchField('number_long_nullable')?.type).toEqual('long');
  expect(fetchField('number_float_optional')?.type).toEqual('float');
  expect(fetchField('number_double_nullable_optional')?.type).toEqual('double');
  expect(fetchField('date_array_nonnull_mandatory')?.type).toEqual('date');
  expect(fetchField('boolean_array_nullable')?.type).toEqual('boolean');
  expect(fetchField('keyword_array_optional')?.type).toEqual('keyword');
  expect(fetchField('text_array_nullable_optional')?.type).toEqual('text');
});
