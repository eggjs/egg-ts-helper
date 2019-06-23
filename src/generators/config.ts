import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TsGenConfig, TsHelperConfig } from '..';
import { declMapping } from '../config';
import * as utils from '../utils';

const EXPORT_DEFAULT_FUNCTION = 1;
const EXPORT_DEFAULT = 2;
const EXPORT = 3;
const cache: { [key: string]: ImportItem } = {};

export interface ImportItem {
  import: string;
  declaration: string;
  moduleName: string;
}

export const defaultConfig = {
  // only need to parse config.default.ts or config.ts
  pattern: 'config(.default|).(ts|js)',
  interface: declMapping.config,
};

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
      const type = checkConfigReturnType(abUrl);
      const { moduleName: sModuleName } = utils.getModuleObjByPath(f);
      const moduleName = `Export${sModuleName}`;
      const importContext = utils.getImportStr(
        config.dtsDir,
        abUrl,
        moduleName,
        type === EXPORT,
      );

      let tds = `type ${sModuleName} = `;
      if (type === EXPORT_DEFAULT_FUNCTION) {
        tds += `ReturnType<typeof ${moduleName}>;`;
      } else if (type === EXPORT_DEFAULT || type === EXPORT) {
        tds += `typeof ${moduleName};`;
      } else {
        return;
      }

      // cache the file
      cache[abUrl] = {
        import: importContext,
        declaration: tds,
        moduleName: sModuleName,
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
      `type ${newConfigType} = ${moduleList.join(' & ')};\n` +
      `declare module '${baseConfig.framework}' {\n` +
      `  interface ${config.interface} extends ${newConfigType} { }\n` +
      '}',
  };
}

// check config return type.
export function checkConfigReturnType(f: string) {
  const result = utils.findExportNode(fs.readFileSync(f, 'utf-8'));
  if (result.exportDefaultNode) {
    return ts.isFunctionLike(result.exportDefaultNode)
      ? EXPORT_DEFAULT_FUNCTION
      : EXPORT_DEFAULT;
  } else if (result.exportNodeList.length) {
    return EXPORT;
  }
}
