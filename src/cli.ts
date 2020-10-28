#!/usr/bin/env node

import * as arg from 'arg';
import { promises as fsPromises } from 'fs';
import { IndexMappingBuilder } from './index-mapping';
import { DtsGenerator } from './dts-generator';
import { Client } from '@elastic/elasticsearch';
import { FieldTypeSpec } from './type-spec';
import { logger } from './logger';

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
      logger.info(`Option --node <URL> is not specified. Use default: ${this.node}`);
    } else {
      this.node = args['--node'];
    }

    if (!args['--destination']) {
      logger.info(`Option --destination <DIR> is not specified. Use default: ${this.destination}`);
    } else {
      this.destination = args['--destination'];
      if (this.destination.endsWith('/')) {
        this.destination = this.destination.slice(0, -1);
      }
    }

    if (!args['--default-types']) {
      logger.info(`Option --default-types <types...> is not specified. Use default: ${this.defaultTypeSpec}`);
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
      logger.error('elasticsearch-js caught an error: ', err);
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
    const code = new DtsGenerator(mapping, args.defaultTypeSpec).generate();

    logger.info(`Generated type definition: index = ${mapping.name}, file = ${filename}\n${code}`);

    await fsPromises.writeFile(filename, code);
  }
}

main()
  .then(() => logger.info('Done.'))
  .catch((e) => {
    logger.error('Unexpected error occurred.', e);
  });
