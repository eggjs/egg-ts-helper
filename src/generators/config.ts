import * as d from 'debug';
import * as path from 'path';
import * as ts from 'typescript';
import TsHelper from '..';
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

export default function(tsHelper: TsHelper) {
  tsHelper.register('config', (config, baseConfig) => {
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

    const { base, inserts, property } = config.interface;
    const newType = `New${base}`;
    return {
      dist,
      content:
        `import { ${base} } from '${baseConfig.framework}';\n` +
        `${importList.join('\n')}\n` +
        `${declarationList.join('\n')}\n` +
        `type ${newType} = ${base} & ${moduleList.join(' & ')};\n\n` +
        `declare module '${baseConfig.framework}' {\n` +
        inserts
          .map(prop => {
            return (
              `  interface ${prop} {\n` +
              `    ${property}: ${newType};\n` +
              `  }\n`
            );
          })
          .join('\n') +
        `}`,
    };
  });
}

// check config return type.
export function checkConfigReturnType(f: string) {
  const sourceFile = utils.getSourceFile(f);
  if (!sourceFile) {
    return;
  }

  let hasExport = false;
  let exportElement: ts.Node | undefined;
  utils.eachSourceFile(sourceFile, node => {
    if (node.parent !== sourceFile) {
      return;
    }

    if (ts.isExportAssignment(node)) {
      // has export default ...
      exportElement = node.expression;
      return false;
    } else if (utils.modifierHas(node, ts.SyntaxKind.ExportKeyword)) {
      if (utils.modifierHas(node, ts.SyntaxKind.DefaultKeyword)) {
        exportElement = node;
        return;
      }

      // has export
      hasExport = true;
    }
  });

  if (exportElement) {
    return ts.isFunctionLike(exportElement)
      ? EXPORT_DEFAULT_FUNCTION
      : EXPORT_DEFAULT;
  } else if (hasExport) {
    return EXPORT;
  }
}
