import * as d from 'debug';
import * as glob from 'glob';
import * as path from 'path';
import TsHelper from '../';
const debug = d('egg-ts-helper#generators_class');

export default function(tsHelper: TsHelper) {
  tsHelper.register('class', (config, baseConfig) => {
    const dtsDir = path.resolve(
      baseConfig.typings,
      path.relative(baseConfig.cwd, config.dir),
    );

    let fileList = glob.sync('**/*.@(js|ts)', { cwd: config.dir });
    const dist = path.resolve(dtsDir, 'index.d.ts');

    // filter d.ts and the same name ts/js
    fileList = fileList.filter(f => {
      return !(
        f.endsWith('.d.ts') ||
        (f.endsWith('.js') &&
          fileList.includes(f.substring(0, f.length - 2) + 'ts'))
      );
    });

    debug('file list : %o', fileList);
    if (!fileList.length) {
      return { dist };
    }

    // using to compose import code
    let importStr = '';
    // using to create interface mapping
    const interfaceMap: PlainObject = {};

    fileList.forEach(f => {
      f = f.substring(0, f.lastIndexOf('.'));
      const props = f.split('/').map(prop =>
        // transfer _ to uppercase
        prop.replace(/[_-][a-z]/gi, s => s.substring(1).toUpperCase()),
      );

      // composing moduleName
      const moduleName = props
        .map(prop => prop[0].toUpperCase() + prop.substring(1))
        .join('');
      const tsPath = path
        .relative(dtsDir, path.join(config.dir, f))
        .replace(/\/|\\/g, '/');
      debug('import %s from %s', moduleName, tsPath);
      importStr += `import ${moduleName} from '${tsPath}';\n`;

      // create mapping
      let collector = interfaceMap;
      while (props.length) {
        const name = camelProp(props.shift() as string, baseConfig.caseStyle);
        if (!props.length) {
          collector[name] = moduleName;
        } else {
          collector = collector[name] = collector[name] || {};
        }
      }
    });

    return {
      dist,
      content:
        `${importStr}\n` +
        `declare module '${baseConfig.framework}' {\n` +
        `  interface ${config.interface} {\n` +
        composeInterface(interfaceMap, '    ') +
        '  }\n' +
        '}\n',
    };
  });
}

function composeInterface(obj: PlainObject, indent: string = ''): string {
  let str = '';

  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (typeof val === 'string') {
      str += `${indent + key}: ${val};\n`;
    } else {
      const newVal = composeInterface(val, indent + '  ');
      if (newVal) {
        str += `${indent + key}: {\n${newVal + indent}};\n`;
      }
    }
  });

  return str;
}

// like egg-core/file-loader
function camelProp(property: string, caseStyle: string): string {
  let first = property[0];
  // istanbul ignore next
  switch (caseStyle) {
    case 'lower':
      first = first.toLowerCase();
      break;
    case 'upper':
      first = first.toUpperCase();
      break;
    case 'camel':
    default:
  }

  return first + property.substring(1);
}
