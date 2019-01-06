import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

const cache: { [key: string]: string[] } = {};

export const defaultConfig = {
  pattern: 'plugin*.(ts|js)',
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
  const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
  if (!fileList.length) {
    return { dist };
  }

  let importList: string[] = [];
  fileList.forEach(f => {
    const abUrl = path.resolve(config.dir, f);

    // read from cache
    if (!cache[abUrl] || config.file === abUrl) {
      const exportResult = utils.findExportNode(
        fs.readFileSync(abUrl, 'utf-8'),
      );
      if (!exportResult) {
        return;
      }

      // collect package name
      const collectPackageName = (property: ts.ObjectLiteralExpression) => {
        let packageIsEnable: boolean | undefined = true;
        let packageName: string | undefined;

        property.properties.forEach(prop => {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            if (prop.name.escapedText === 'package') {
              // { package: 'xxx' }
              packageName = ts.isStringLiteral(prop.initializer)
                ? prop.initializer.text
                : undefined;
            } else if (
              prop.name.escapedText === 'enable' &&
              prop.initializer.kind === ts.SyntaxKind.FalseKeyword
            ) {
              // { enable: false }
              packageIsEnable = false;
            }
          }
        });

        if (
          packageName &&
          packageIsEnable &&
          utils.moduleExist(packageName, baseConfig.cwd)
        ) {
          importList.push(packageName);
        }
      };

      // check return node
      if (exportResult.exportDefaultNode) {
        // export default {  }
        if (ts.isObjectLiteralExpression(exportResult.exportDefaultNode)) {
          for (const property of exportResult.exportDefaultNode.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              ts.isObjectLiteralExpression(property.initializer)
            ) {
              collectPackageName(property.initializer);
            }
          }
        }
      } else if (exportResult.exportNodeList.length) {
        // export const xxx = {};
        for (const property of exportResult.exportNodeList) {
          if (
            ts.isBinaryExpression(property) &&
            ts.isObjectLiteralExpression(property.right)
          ) {
            collectPackageName(property.right);
          } else if (
            ts.isVariableDeclaration(property) &&
            property.initializer &&
            ts.isObjectLiteralExpression(property.initializer)
          ) {
            collectPackageName(property.initializer);
          }
        }
      }
    } else {
      importList = importList.concat(cache[abUrl]);
    }
  });

  if (!importList.length) {
    return { dist };
  }

  return {
    dist,

    // remove duplicate before map
    content: Array.from(new Set(importList))
      .map(p => `import '${p}';`)
      .join('\n'),
  };
}
