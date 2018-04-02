import * as d from 'debug';
import * as path from 'path';
import TsHelper from '../';
import * as utils from '../utils';
const debug = d('egg-ts-helper#generators_class');

export default function(tsHelper: TsHelper) {
  tsHelper.register('class', (config, baseConfig) => {
    const fileList = utils.loadFiles(config.dir, config.pattern);
    const dist = path.resolve(config.dtsDir, 'index.d.ts');

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
      const obj = utils.getModuleObjByPath(f);
      const tsPath = path
        .relative(config.dtsDir, path.join(config.dir, f))
        .replace(/\/|\\/g, '/');
      debug('import %s from %s', obj.moduleName, tsPath);
      importStr += `import ${obj.moduleName} from '${tsPath}';\n`;

      // create mapping
      let collector = interfaceMap;
      while (obj.props.length) {
        const name = camelProp(
          obj.props.shift() as string,
          baseConfig.caseStyle,
        );

        if (!obj.props.length) {
          collector[name] = obj.moduleName;
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
