export class FieldTypeSpec {
  readonly singleValue: boolean;
  readonly multipleValues: boolean;
  readonly nullable: boolean;
  readonly optional: boolean;

  constructor(singleValue: boolean, multipleValues: boolean, nullable: boolean, optional: boolean) {
    this.singleValue = singleValue;
    this.multipleValues = multipleValues;
    this.nullable = nullable;
    this.optional = optional;
  }

  toTypeDefinition(type: string): string {
    const result: string[] = [
      this.singleValue ? type : null,
      this.multipleValues ? `Array<${type}>` : null,
      this.nullable ? 'null' : null,
      this.optional ? 'undefined' : null,
    ].filter(this.notNull) as string[];

    return result.join(' | ');
  }

  notNull(val: string | null): val is string {
    return val !== null;
  }
}
