import traverse from 'babel-traverse';
import * as t from 'babel-types';
import * as babylon from 'babylon';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { default as TsHelper, GeneratorResult } from '../';

export default function(tsHelper: TsHelper) {
  tsHelper.register('extend', (config, baseConfig) => {
    const dtsDir = path.resolve(
      baseConfig.typings,
      path.relative(baseConfig.cwd, config.dir),
    );

    let fileList: string[];
    if (!config.file) {
      fileList = glob.sync('**/*.@(js|ts)', { cwd: config.dir });

      // filter d.ts and the same name ts/js
      fileList = fileList.filter(
        f => !(f.endsWith('.d.ts') || f.endsWith('.js')),
      );
    } else {
      fileList = config.file.endsWith('.ts') ? [config.file] : [];
    }

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
        return { dist };
      }

      const content = fs.readFileSync(f, {
        encoding: 'utf-8',
      });

      // parse ts
      const ast = babylon.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'exportNamespaceFrom',
          'exportDefaultFrom',
          'asyncGenerators',
          'classProperties',
        ] as any,
      });

      const properties = findReturnProperties(ast);
      if (!properties || !properties.length) {
        return;
      }

      let tsPath = path.relative(dtsDir, f);
      tsPath = tsPath.substring(0, tsPath.lastIndexOf('.'));

      tsList.push({
        dist,
        content:
          `import ExtendObject from '${tsPath}';\n` +
          'declare module \'egg\' {\n' +
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

function findReturnProperties(ast: t.File) {
  let properties: string[] | undefined;
  const cache = {};

  traverse(ast, {
    enter(p) {
      // skip inner scope
      if (p.scope.parent) {
        return;
      }

      // collect variable declaration
      if (t.isVariableDeclaration(p.node)) {
        const declarations = p.node.declarations;
        declarations.forEach(declaration => {
          // const abc = {};
          if (
            t.isIdentifier(declaration.id) &&
            t.isObjectExpression(declaration.init)
          ) {
            cache[declaration.id.name] = declaration.init;
          }
        });
      } else if (t.isAssignmentExpression(p.node)) {
        // let abc;
        // abc = {};
        if (t.isIdentifier(p.node.left) && t.isObjectExpression(p.node.right)) {
          cache[p.node.left.name] = p.node.right;
        }
      }

      // export default xx
      if (t.isExportDefaultDeclaration(p.node)) {
        if (t.isObjectExpression(p.node.declaration)) {
          // export default { xxx }
          properties = getKeyList(p.node.declaration);
        } else if (t.isIdentifier(p.node.declaration)) {
          // const abc = { };
          // export default abc
          const name = p.node.declaration.name;
          if (cache[name]) {
            properties = getKeyList(cache[name]);
          }
        }
      }
    },
  });

  return properties;
}

function getKeyList(node: t.ObjectExpression) {
  const keyList = node.properties
    .map(item => {
      if (t.isObjectMember(item) && t.isIdentifier(item.key)) {
        return item.key.name;
      }
    })
    .filter(item => !!item);
  return keyList as string[];
}
