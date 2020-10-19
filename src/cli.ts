import * as arg from 'arg';
import { promises as fsPromises } from 'fs';
import { IndexMapping } from './index-mapping';
import { DefaultType } from './default-type';
import { DtsGenerator } from './dts-generator';
import * as colors from 'colors';

const ArgSpec = {
  '--node': String,
  '--destination': String,
  '--default-types': String,
  '-d': '--destination',
};

class Argument {
  node = 'http://localhost:9200/';
  destination = 'generated/es';
  defaultTypes: DefaultType = ['single'];

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
      console.log(`Option --default-types <types...> is not specified. Use default: ${this.defaultTypes}`);
    } else {
      const defaultTypes = [...new Set<string>(args['--default-types'].split(',').map((s) => s.trim()))];
      defaultTypes.forEach((s) => {
        if (!['single', 'array', 'undefined'].includes(s)) {
          throw Error(`Unsupported default type: ${s}`);
        }
      });

      this.defaultTypes = defaultTypes as DefaultType;
    }
  }
}

async function main(): Promise<void> {
  const args = new Argument();
  const indexMappings = await IndexMapping.getIndexMappings(args.node);

  await fsPromises.mkdir(args.destination, { recursive: true });

  for (let i = 0; i < indexMappings.length; i++) {
    const mapping = indexMappings[i];

    const filename = `${args.destination}/${mapping.name}.d.ts`;
    console.log(`[${colors.green(mapping.name)}] ${colors.underline(filename)}`);

    const code = new DtsGenerator(mapping, args.defaultTypes).generate();
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
