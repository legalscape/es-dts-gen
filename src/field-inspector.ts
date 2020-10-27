import { Client } from '@elastic/elasticsearch';
import { FieldTypeSpec } from './type-spec';
import { SearchResponse } from './es/search';

class FieldInspector {
  readonly client: Client;
  readonly indexName: string;
  readonly sampleSize = 10;

  constructor(client: Client, indexName: string) {
    this.client = client;
    this.indexName = indexName;
  }

  async inspect(fieldName: string, ancestors: string[]): Promise<FieldTypeSpec> {
    const { singleValue, multipleValues } = await this.inspectActualType(fieldName, ancestors);
    const { nullable, optional } = await this.inspectNullabilityAndOptionality(fieldName, ancestors);
    return new FieldTypeSpec(singleValue, multipleValues, nullable, optional);
  }

  async inspectActualType(
    fieldName: string,
    ancestors: string[]
  ): Promise<{ singleValue: boolean; multipleValues: boolean }> {
    const fieldValues = await this.fetchFieldValues(fieldName, ancestors, true);

    const singleValue = fieldValues.length === 0 || fieldValues.filter((val) => !Array.isArray(val)).length > 0;
    const multipleValues = fieldValues.filter((val) => Array.isArray(val)).length > 0;

    return { singleValue, multipleValues };
  }

  async inspectNullabilityAndOptionality(
    fieldName: string,
    ancestors: string[]
  ): Promise<{ nullable: boolean; optional: boolean }> {
    const fieldValues = await this.fetchFieldValues(fieldName, ancestors, false);

    const nullable = fieldValues.filter((val) => val === null).length > 0;
    const optional = fieldValues.filter((val) => val === void 0).length > 0;

    return { nullable, optional };
  }

  fetchFieldValues(fieldName: string, ancestors: string[], exists: boolean): Promise<unknown[]> {
    const query = InspectionQueryBuilder.build(fieldName, ancestors, exists);

    return this.client
      .search<SearchResponse<Record<string, unknown>>>({
        index: this.indexName,
        body: {
          from: 0,
          size: this.sampleSize,
          _source: [ancestors[0] || fieldName],
          query,
        },
      })
      .then((res) => res.body.hits.hits.map((hit) => hit._source))
      .then((docs) => InspectionResultRetriever.retrieve(docs, ancestors, fieldName));
  }
}

export class InspectionQueryBuilder {
  static build(fieldName: string, ancestors: string[], exists: boolean): Record<string, unknown> {
    return ancestors.length > 0
      ? InspectionQueryBuilder.buildNestedBoolQuery(fieldName, ancestors, exists)
      : InspectionQueryBuilder.buildFieldBoolQuery(fieldName, exists);
  }

  private static buildFieldBoolQuery(fieldName: string, exists: boolean): Record<string, unknown> {
    const fieldExists = InspectionQueryBuilder.buildFieldExists(fieldName);
    return { bool: exists ? { filter: fieldExists } : { must_not: fieldExists } };
  }

  private static buildFieldExists(fieldName: string): Record<string, unknown> {
    return {
      exists: {
        field: fieldName,
      },
    };
  }

  private static buildNestedBoolQuery(
    fieldName: string,
    ancestors: string[],
    exists: boolean
  ): Record<string, unknown> {
    const nestedFieldExists = InspectionQueryBuilder.buildNestedExists([...ancestors, fieldName].join('.'), ancestors);

    if (exists) {
      return {
        bool: {
          filter: nestedFieldExists,
        },
      };
    } else {
      return {
        bool: {
          must_not: nestedFieldExists,
          filter: InspectionQueryBuilder.buildNestedExists(ancestors.join('.'), ancestors),
        },
      };
    }
  }

  private static buildNestedExists(fieldName: string, ancestors: string[]): Record<string, unknown> {
    return {
      nested: {
        path: ancestors.join('.'),
        query: {
          bool: {
            filter: InspectionQueryBuilder.buildFieldExists(fieldName),
          },
        },
      },
    };
  }
}

export class InspectionResultRetriever {
  static retrieve(docs: Record<string, unknown>[], ancestors: string[], fieldName: string): unknown[] {
    for (const ancestor of ancestors) {
      const nextDocs: Record<string, unknown>[] = [];

      for (const doc of docs) {
        const child = doc[ancestor];
        if (!child) {
          continue;
        }

        if (InspectionResultRetriever.isArray(child)) {
          nextDocs.push(...InspectionResultRetriever.toArray(child));
        } else if (InspectionResultRetriever.isObject(child)) {
          nextDocs.push(child);
        }
      }

      docs = nextDocs;
    }

    return docs.map((doc) => doc[fieldName]);
  }

  private static isArray(o: unknown): o is unknown[] {
    return Array.isArray(o);
  }

  private static toArray(a: unknown[]): Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];

    for (const o of a) {
      if (InspectionResultRetriever.isObject(o)) {
        result.push(o);
      }
    }

    return result;
  }

  private static isObject(o: unknown): o is Record<string, unknown> {
    return typeof o === 'object' && !InspectionResultRetriever.isArray(o);
  }
}

export { FieldInspector };
