import { DefaultType } from './default-type';
import { IndexMapping, IndexMappingField, IndexMappingNestedField } from './index-mapping';

import * as prettier from 'prettier';

export class DtsGenerator {
  readonly indexMapping: IndexMapping;
  readonly defaultTypes: DefaultType;
  readonly prefix = 'Es';
  interfaceCodes: { [interfaceName: string]: string } = {};
  stack: string[] = [];

  constructor(indexMapping: IndexMapping, defaultTypes: DefaultType) {
    this.indexMapping = indexMapping;
    this.defaultTypes = defaultTypes;
  }

  generate(): string {
    this.generateInterfaceCode(this.createInterfaceName(this.indexMapping.name), this.indexMapping.fields);

    const interfaceCodes = Object.values(this.interfaceCodes).join('\n\n');
    return prettier.format(interfaceCodes, { parser: 'typescript', printWidth: 120 });
  }

  generateInterfaceCode(interfaceName: string, fields: Array<IndexMappingField | IndexMappingNestedField>): void {
    this.stack.push(interfaceName);

    const propertyDeclaration = this.generatePropertyDeclaration(fields);
    this.interfaceCodes[interfaceName] = `interface ${interfaceName} { ${propertyDeclaration} }`;

    this.stack.pop();
  }

  generatePropertyDeclaration(fields: Array<IndexMappingField | IndexMappingNestedField>): string {
    const propertyDefinitions = fields.map((field) => {
      try {
        const tsType = this.toTsType(field);
        const types = [
          this.defaultTypes.includes('single') ? tsType : null,
          this.defaultTypes.includes('array') ? `Array<${tsType}>` : null,
          this.defaultTypes.includes('undefined') ? 'undefined' : null,
        ].filter((s) => s !== null);

        return `${field.name}: ${types.join(' | ')};`;
      } catch (e) {
        console.log(`Error: failed to convert type: field name = ${field.name}, type = ${field.type}.\nCaused by:`, e);
        throw e;
      }
    });

    return propertyDefinitions.join(' ');
  }

  toTsType(field: IndexMappingField | IndexMappingNestedField): string {
    switch (field.type) {
      case 'boolean':
        return field.type;
      case 'integer':
      case 'long':
      case 'double':
      case 'float':
      case 'half_float':
        return 'number';
      case 'keyword':
      case 'text':
        return 'string';
      case 'date':
        return 'Date';
      case 'nested':
        const childInterfaceName = this.createInterfaceName(field.name);
        this.generateInterfaceCode(childInterfaceName, (field as IndexMappingNestedField).fields);
        return childInterfaceName;
      case 'object':
      case undefined:
        return 'Record<string, any>';
      default:
        throw new Error(`Unsupported type: ${field.type}`);
    }
  }

  createInterfaceName(name: string): string {
    return this.prefix + [...this.stack, this.toUpperCamelCase(name)].join('_');
  }

  toUpperCamelCase(input: string): string {
    return this.toCamelCase(input, true);
  }

  toCamelCase(input: string, upcasesFirstWord: boolean): string {
    const words = input
      .trim()
      .split(/[_-]/)
      .map((word) => word.trim());

    if (words.length == 0) {
      return '';
    }

    const result = upcasesFirstWord ? words.map(this.capitalize) : [words[0], ...words.slice(1).map(this.capitalize)];

    return result.join('');
  }

  capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}
