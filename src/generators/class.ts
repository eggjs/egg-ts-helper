import d from 'debug';
import path from 'path';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
let uniqId = 100;
const debug = d('egg-ts-helper#generators_class');

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
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
      const name = utils.camelProp(
        obj.props.shift() as string,
        config.caseStyle || baseConfig.caseStyle,
      );

      if (!obj.props.length) {
        collector[name] = obj.moduleName;
      } else {
        collector = collector[name] = collector[name] || {};
      }
    }
  });

  // interface name
  const interfaceName = config.interface || `TC${uniqId++}`;

  // add mount interface
  let declareInterface;
  if (config.declareTo) {
    const interfaceList: string[] = config.declareTo.split('.');
    declareInterface = composeInterface(
      interfaceList.slice(1).concat(interfaceName),
      interfaceList[0],
      undefined,
      '  ',
    );
  }

  return {
    dist,
    content:
      `${importStr}\n` +
      `declare module '${config.framework || baseConfig.framework}' {\n` +
      (declareInterface ? `${declareInterface}\n` : '') +
      composeInterface(
        interfaceMap,
        interfaceName,
        config.interfaceHandle,
        '  ',
      ) +
      '}\n',
  };
}

// composing all the interface
function composeInterface(
  obj: PlainObject | string[],
  wrapInterface?: string,
  preHandle?: (v: string) => string,
  indent?: string,
) {
  let prev = '';
  let mid = '';
  let after = '';
  indent = indent || '';

  if (wrapInterface) {
    prev = `${indent}interface ${wrapInterface} {\n`;
    after = `${indent}}\n`;
    indent += '  ';
  }

  // compose array to object
  // ['abc', 'bbc', 'ccc'] => { abc: { bbc: 'ccc' } }
  if (Array.isArray(obj)) {
    let curr: any = obj.pop();
    while (obj.length) {
      curr = { [obj.pop()!]: curr };
    }
    obj = curr;
  }

  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (typeof val === 'string') {
      mid += `${indent + key}: ${preHandle ? preHandle(val) : val};\n`;
    } else {
      const newVal = composeInterface(val, undefined, preHandle, indent + '  ');
      if (newVal) {
        mid += `${indent + key}: {\n${newVal + indent}}\n`;
      }
    }
  });

  return `${prev}${mid}${after}`;
}
