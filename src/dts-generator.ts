import { IndexMapping, IndexMappingField, IndexMappingNestedField } from './index-mapping';

import * as prettier from 'prettier';
import { FieldTypeSpec } from './type-spec';
import { logger } from './logger';
import * as util from 'util';

export class DtsGenerator {
  readonly indexMapping: IndexMapping;
  readonly defaultSpec: FieldTypeSpec;
  readonly prefix = 'Es';
  interfaceCodes: { [interfaceName: string]: string } = {};
  stack: string[] = [];

  constructor(indexMapping: IndexMapping, defaultSpec: FieldTypeSpec) {
    this.indexMapping = indexMapping;
    this.defaultSpec = defaultSpec;
  }

  generate(): string {
    this.generateInterfaceCode(this.createInterfaceName(this.indexMapping.name), this.indexMapping.fields);

    const interfaceCodes = Object.values(this.interfaceCodes).join('\n\n');
    return prettier.format(interfaceCodes, { parser: 'typescript', printWidth: 120 });
  }

  generateInterfaceCode(interfaceName: string, fields: Array<IndexMappingField | IndexMappingNestedField>): void {
    this.stack.push(interfaceName);

    const propertyDeclaration = this.generatePropertyDeclaration(fields);
    this.interfaceCodes[interfaceName] = `export interface ${interfaceName} { ${propertyDeclaration} }`;

    this.stack.pop();
  }

  generatePropertyDeclaration(fields: Array<IndexMappingField | IndexMappingNestedField>): string {
    const propertyDefinitions = fields.map((field) => {
      try {
        const tsType = this.toTsType(field);
        const spec = field.spec || this.defaultSpec;
        return `${field.name}: ${spec.toTypeDefinition(tsType)};`;
      } catch (e) {
        logger.error(
          `Error: failed to convert type: field name = ${field.name}, type = ${field.type}.\nCaused by:`,
          util.inspect(e, { depth: Infinity })
        );
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
    if (this.stack.length > 0) {
      return `${this.stack[this.stack.length - 1]}_${this.toUpperCamelCase(name)}`;
    }
    return this.prefix + this.toUpperCamelCase(name);
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
