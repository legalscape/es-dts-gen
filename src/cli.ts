#!/usr/bin/env node

import * as arg from 'arg';
import { promises as fsPromises } from 'fs';
import { IndexMappingBuilder } from './index-mapping';
import { DtsGenerator } from './dts-generator';
import * as colors from 'colors';
import { Client } from '@elastic/elasticsearch';
import * as util from 'util';
import { FieldTypeSpec } from './type-spec';

const ArgSpec = {
  '--node': String,
  '--destination': String,
  '--default-types': String,
  '-d': '--destination',
};

class Argument {
  node = 'http://localhost:9200/';
  destination = 'generated/es';
  defaultTypeSpec: FieldTypeSpec = new FieldTypeSpec(true, false, false, false);

  constructor() {
    const args = arg(ArgSpec);

    if (!args['--node']) {
      console.log(`Option --node <URL> is not specified. Use default: ${this.node}`);
    } else {
      this.node = args['--node'];
    }

    if (!args['--destination']) {
      console.log(`Option --destination <DIR> is not specified. Use default: ${this.destination}`);
    } else {
      this.destination = args['--destination'];
      if (this.destination.endsWith('/')) {
        this.destination = this.destination.slice(0, -1);
      }
    }

    if (!args['--default-types']) {
      console.log(`Option --default-types <types...> is not specified. Use default: ${this.defaultTypeSpec}`);
    } else {
      const defaultTypes = [...new Set<string>(args['--default-types'].split(',').map((s) => s.trim()))];
      defaultTypes.forEach((s) => {
        if (!['single', 'array', 'null', 'undefined'].includes(s)) {
          throw Error(`Unsupported default type: ${s}`);
        }
      });

      this.defaultTypeSpec = new FieldTypeSpec(
        defaultTypes.includes('single'),
        defaultTypes.includes('array'),
        defaultTypes.includes('null'),
        defaultTypes.includes('undefined')
      );
    }
  }
}

function initEsClient(node: string): Client {
  const client = new Client({ node });
  client.on('response', (err) => {
    if (err) {
      console.error(util.inspect(err, { depth: Infinity }));
    }
  });

  return client;
}

async function main(): Promise<void> {
  const args = new Argument();

  const client = initEsClient(args.node);
  const indexMappings = await new IndexMappingBuilder(client).build();

  await fsPromises.mkdir(args.destination, { recursive: true });

  for (let i = 0; i < indexMappings.length; i++) {
    const mapping = indexMappings[i];

    const filename = `${args.destination}/${mapping.name}.d.ts`;
    console.log(`[${colors.green(mapping.name)}] ${colors.underline(filename)}`);

    const code = new DtsGenerator(mapping, args.defaultTypeSpec).generate();
    console.log(colors.grey(code));

    await fsPromises.writeFile(filename, code);
  }
}

main()
  .then(() => console.log('Done.'))
  .catch((e) => {
    console.log('Unexpected error occurred.');
    console.log(e);
  });
