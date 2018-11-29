import d from 'debug';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
const debug = d('egg-ts-helper#generators_config');

export const EXPORT_DEFAULT_FUNCTION = 1;
export const EXPORT_DEFAULT = 2;
export const EXPORT = 3;

export interface ImportItem {
  import: string;
  declaration: string;
  moduleName: string;
}

const cache: { [key: string]: ImportItem } = {};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
  const dist = path.resolve(config.dtsDir, 'index.d.ts');
  if (!fileList.length) {
    return { dist };
  }

  const importList: string[] = [];
  const declarationList: string[] = [];
  const moduleList: string[] = [];
  fileList.forEach(f => {
    const abUrl = path.resolve(config.dir, f);

    // read from cache
    if (!cache[abUrl] || config.file === abUrl) {
      f = f.substring(0, f.lastIndexOf('.'));
      const type = checkConfigReturnType(abUrl);
      const moduleName = utils.getModuleObjByPath(f).moduleName;
      const tsPath = path
        .relative(config.dtsDir, path.join(config.dir, f))
        .replace(/\/|\\/g, '/');
      debug('import %s from %s', moduleName, tsPath);

      const imn = `Export${moduleName}`;
      const prefix = type === EXPORT ? '* as ' : '';
      const ims = `import ${prefix}${imn} from '${tsPath}';`;
      let tds = `type ${moduleName} = `;

      if (type === EXPORT_DEFAULT_FUNCTION) {
        tds += `ReturnType<typeof ${imn}>;`;
      } else if (type === EXPORT_DEFAULT || type === EXPORT) {
        tds += `typeof ${imn};`;
      } else {
        return;
      }

      // cache the file
      cache[abUrl] = {
        import: ims,
        declaration: tds,
        moduleName,
      };
    }

    const cacheItem = cache[abUrl];
    importList.push(cacheItem.import);
    declarationList.push(cacheItem.declaration);
    moduleList.push(cacheItem.moduleName);
  });

  if (!importList.length) {
    return { dist };
  }

  const newConfigType = `New${config.interface}`;
  return {
    dist,
    content:
      `import { ${config.interface} } from '${baseConfig.framework}';\n` +
      `${importList.join('\n')}\n` +
      `${declarationList.join('\n')}\n` +
      `declare module '${baseConfig.framework}' {\n` +
      `  type ${newConfigType} = ${moduleList.join(' & ')};\n` +
      `  interface ${config.interface} extends ${newConfigType} { }\n` +
      `}`,
  };
}

// check config return type.
export function checkConfigReturnType(f: string) {
  const result = utils.findExportNode(fs.readFileSync(f, 'utf-8'));
  if (!result) {
    return;
  }

  if (result.exportDefaultNode) {
    return ts.isFunctionLike(result.exportDefaultNode)
      ? EXPORT_DEFAULT_FUNCTION
      : EXPORT_DEFAULT;
  } else if (result.exportNodeList.length) {
    return EXPORT;
  }
}
