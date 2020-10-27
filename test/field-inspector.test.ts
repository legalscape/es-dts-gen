import { InspectionQueryBuilder, InspectionResultRetriever } from '../src/field-inspector';

describe('InspectionQueryBuilder', () => {
  test('Field exists', () => {
    const result = InspectionQueryBuilder.build('foo', [], true);
    expect(result).toEqual({
      bool: {
        filter: {
          exists: {
            field: 'foo',
          },
        },
      },
    });
  });

  test('Field does not exist', () => {
    const result = InspectionQueryBuilder.build('foo', [], false);
    expect(result).toEqual({
      bool: {
        must_not: {
          exists: {
            field: 'foo',
          },
        },
      },
    });
  });

  test('Nested field exists', () => {
    const result = InspectionQueryBuilder.build('bar', ['foo'], true);
    expect(result).toEqual({
      bool: {
        filter: {
          nested: {
            path: 'foo',
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'foo.bar',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test('Nested field does not exist', () => {
    const result = InspectionQueryBuilder.build('bar', ['foo'], false);
    expect(result).toEqual({
      bool: {
        must_not: {
          nested: {
            path: 'foo',
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'foo.bar',
                  },
                },
              },
            },
          },
        },
        filter: {
          nested: {
            path: 'foo',
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'foo',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test('Multiple nested field exists', () => {
    const result = InspectionQueryBuilder.build('baz', ['foo', 'bar'], true);
    expect(result).toEqual({
      bool: {
        filter: {
          nested: {
            path: 'foo.bar',
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'foo.bar.baz',
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});

describe('InspectionResultRetriever', () => {
  describe('Simple object', () => {
    const docs = [
      {
        array: [1, 2],
        nonnull: 'text1',
        nullable: null,
      },
      {
        array: [3, 4, 5],
        nonnull: 'text2',
        nullable: 1,
        optional: 0.5,
      },
    ];

    test('Retrieve array field', () => {
      const result = InspectionResultRetriever.retrieve(docs, [], 'array');
      expect(result).toEqual([
        [1, 2],
        [3, 4, 5],
      ]);
    });

    test('Retrieve nonnull field', () => {
      const result = InspectionResultRetriever.retrieve(docs, [], 'nonnull');
      expect(result).toEqual(['text1', 'text2']);
    });

    test('Retrieve nullable field', () => {
      const result = InspectionResultRetriever.retrieve(docs, [], 'nullable');
      expect(result).toEqual([null, 1]);
    });

    test('Retrieve optional field', () => {
      const result = InspectionResultRetriever.retrieve(docs, [], 'optional');
      expect(result).toEqual([undefined, 0.5]);
    });
  });

  describe('Nested object', () => {
    const docs = [
      {
        nested_object: {
          array: [1, 2],
          nonnull: 'text1',
          nullable: null,
        },
      },
      {
        nested_object: {
          array: [3, 4, 5],
          nonnull: 'text2',
          nullable: 1,
          optional: 0.5,
        },
      },
      {}
    ];

    test('Retriever array field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested_object'], 'array');
      expect(result).toEqual([
        [1, 2],
        [3, 4, 5],
      ]);
    });

    test('Retrieve nonnull field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested_object'], 'nonnull');
      expect(result).toEqual(['text1', 'text2']);
    });

    test('Retrieve nullable field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested_object'], 'nullable');
      expect(result).toEqual([null, 1]);
    });

    test('Retrieve optional field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested_object'], 'optional');
      expect(result).toEqual([undefined, 0.5]);
    });
  });

  describe('Array of nested object', () => {
    const docs = [
      {
        array_of_nested: [
          {
            array: [1],
            nullable: null,
          },
        ],
      },
      {
        array_of_nested: [
          {
            array: [2, 3],
            nullable: 1,
          },
          {
            array: [4, 5, 6],
            nullable: 2,
          },
        ],
      },
    ];

    test('Retrieve array field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['array_of_nested'], 'array');
      expect(result).toEqual([[1], [2, 3], [4, 5, 6]]);
    });

    test('Retrieve nullable field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['array_of_nested'], 'nullable');
      expect(result).toEqual([null, 1, 2]);
    });
  });

  describe('Nested of nested', () => {
    const docs = [
      {
        nested1: {
          nested2: {
            nonnull: 'text1',
            nullable: null,
          }
        },
      },
      {
        nested1: {
          nested2: {
            nonnull: 'text2',
            nullable: 1,
          }
        }
      }
    ];

    test('Retrieve nonnull field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested1', 'nested2'], 'nonnull');
      expect(result).toEqual(['text1', 'text2']);
    });

    test('Retrieve nullable field', () => {
      const result = InspectionResultRetriever.retrieve(docs, ['nested1', 'nested2'], 'nullable');
      expect(result).toEqual([null, 1]);
    });
  });
});
