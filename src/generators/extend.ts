import * as d from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { default as TsHelper, GeneratorResult } from '../';
import * as utils from '../utils';
const debug = d('egg-ts-helper#generators_extend');

export default function(tsHelper: TsHelper) {
  tsHelper.register('extend', (config, baseConfig) => {
    const dtsDir = path.resolve(
      baseConfig.typings,
      path.relative(baseConfig.cwd, config.dir),
    );

    const fileList = !config.file
      ? utils.loadFiles(config.dir)
      : config.file.endsWith('.ts') ? [config.file] : [];

    debug('file list : %o', fileList);
    if (!fileList.length) {
      return;
    }

    const tsList: GeneratorResult[] = [];
    fileList.forEach(f => {
      const basename = path.basename(f, '.ts');
      const interfaceName = config.interface[basename];
      if (!interfaceName) {
        return;
      }

      const dist = path.resolve(dtsDir, `${basename}.d.ts`);
      f = path.resolve(config.dir, f);
      if (!fs.existsSync(f)) {
        return tsList.push({ dist });
      }

      const properties = findReturnPropertiesByTs(f);
      debug('find return properties : %o', properties);
      if (!properties || !properties.length) {
        return tsList.push({ dist });
      }

      let tsPath = path.relative(dtsDir, f).replace(/\/|\\/g, '/');
      tsPath = tsPath.substring(0, tsPath.lastIndexOf('.'));

      debug('import extendObject from %s', tsPath);
      tsList.push({
        dist,
        content:
          `import ExtendObject from '${tsPath}';\n` +
          `declare module \'${baseConfig.framework}\' {\n` +
          `  interface ${interfaceName} {\n` +
          properties
            .map(prop => `    ${prop}: typeof ExtendObject.${prop};\n`)
            .join('') +
          '  }\n}',
      });
    });

    return tsList;
  });
}

// find properties from ts file.
export function findReturnPropertiesByTs(f: string): string[] | void {
  const code = fs.readFileSync(f, {
    encoding: 'utf-8',
  });

  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(f, code, ts.ScriptTarget.ES2017, true);
  } catch (e) {
    console.error(e);
    return;
  }

  const cache = new Map();
  let exp;

  handleNode(sourceFile);
  function handleNode(node: ts.Node) {
    if (node.parent === sourceFile) {
      // find node in root scope

      if (ts.isVariableStatement(node)) {
        // const exportData = {};
        // export exportData
        const declarations = node.declarationList.declarations;
        declarations.forEach(declaration => {
          if (ts.isIdentifier(declaration.name)) {
            cache.set(declaration.name.escapedText, declaration.initializer);
          }
        });
      } else if (ts.isExportAssignment(node)) {
        // export default {}
        exp = node.expression;
      } else if (
        ts.isExpressionStatement(node) &&
        ts.isBinaryExpression(node.expression)
      ) {
        // let exportData;
        // exportData = {};
        // export exportData
        if (ts.isIdentifier(node.expression.left)) {
          cache.set(node.expression.left.escapedText, node.expression.right);
        }
      }
    }

    ts.forEachChild(node, handleNode);
  }

  if (!exp) {
    return;
  }

  while (ts.isIdentifier(exp) && cache.size) {
    const mid = cache.get(exp.escapedText);
    cache.delete(exp.escapedText);
    exp = mid;
  }

  // parse object;
  if (ts.isObjectLiteralExpression(exp)) {
    return exp.properties
      .map(prop => {
        if (!prop.name) {
          return;
        }

        if (ts.isIdentifier(prop.name)) {
          // { name: value }
          return prop.name.escapedText;
        } else if (ts.isStringLiteral(prop.name)) {
          // { 'name': value }
          return prop.name.text;
        } else if (
          ts.isComputedPropertyName(prop.name) &&
          ts.isStringLiteral(prop.name.expression)
        ) {
          // { ['name']: value }
          return prop.name.expression.text;
        }
      })
      .filter(str => !!str) as string[];
  }
}
