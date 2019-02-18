import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

const cache: { [key: string]: string[] } = {};

// only load plugin.ts|plugin.local.ts|plugin.default.ts
export const defaultConfig = {
  pattern: 'plugin(.local|.default|).(ts|js)',
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
  const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
  const { pluginList, pluginInfos } = utils.getFrameworkPlugins(baseConfig.cwd);
  const appPluginNameList: string[] = Object.keys(pluginInfos);
  let importPlugins: string[] = pluginList.slice(0);
  fileList.forEach(f => {
    const abUrl = path.resolve(config.dir, f);

    // read from cache
    if (!cache[abUrl] || config.file === abUrl) {
      const exportResult = utils.findExportNode(fs.readFileSync(abUrl, 'utf-8'));
      if (!exportResult) {
        return;
      }

      // collect package name
      const collectPackageName = (name: string, property: ts.Node) => {
        if (!name) return;
        const existPackage = pluginInfos[name];
        let packageIsEnable: boolean | undefined = existPackage ? existPackage.enable : true;
        let packageName: string | undefined = existPackage ? existPackage.package : undefined;
        const addPackage = (isEnable: boolean = true) => {
          appPluginNameList.push(name);
          if (isEnable) {
            importPlugins.push(packageName!);
          } else {
            const index = importPlugins.indexOf(packageName!);
            importPlugins.splice(index, 1);
          }
        };

        if (ts.isObjectLiteralExpression(property)) {
          // export const xxx = { enable: true };
          property.properties.forEach(prop => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              if (prop.name.escapedText === 'package') {
                // { package: 'xxx' }
                packageName = ts.isStringLiteral(prop.initializer)
                  ? prop.initializer.text
                  : undefined;
              } else if (prop.name.escapedText === 'enable') {
                // { enable: xxx }
                packageIsEnable = prop.initializer.kind !== ts.SyntaxKind.FalseKeyword;
              }
            }
          });

          if (packageName && utils.moduleExist(packageName, baseConfig.cwd)) {
            addPackage(packageIsEnable);
          }
        } else if (packageName) {
          // export const plugin = true;
          const value = property.getText();
          if (/^true|false$/.exec(value)) addPackage(value === 'true');
        }
      };

      // check return node
      if (exportResult.exportDefault) {
        // export default {  }
        if (ts.isObjectLiteralExpression(exportResult.exportDefault.node)) {
          for (const property of exportResult.exportDefault.node.properties) {
            if (ts.isPropertyAssignment(property)) {
              collectPackageName(utils.getText(property.name), property.initializer);
            }
          }
        }
      } else if (exportResult.exportList.size) {
        // export const xxx = {};
        exportResult.exportList.forEach(({ node }, name) => collectPackageName(name, node));
      }
    } else {
      importPlugins = importPlugins.concat(cache[abUrl]);
    }
  });

  if (!importPlugins.length) {
    return { dist };
  }

  const framework = config.framework || baseConfig.framework;
  const importContent = Array.from(new Set(importPlugins)).map(p => `import '${p}';`).join('\n');
  const composeInterface = (list: string[]) => {
    return `    ${list
      .map(name => `${utils.isIdentifierName(name) ? name : `'${name}'` }?: EggPluginItem;`)
      .join('\n    ')}`;
  };

  return {
    dist,

    content: `${importContent}\n` +
      `import { EggPluginItem } from '${framework}';\n` +
      `declare module '${framework}' {\n` +
      '  interface EggPlugin {\n' +
      `${composeInterface(Array.from(new Set(appPluginNameList)))}\n` +
      '  }\n' +
      '}',
  };
}
