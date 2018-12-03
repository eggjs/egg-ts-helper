import fs from 'fs';
import glob from 'globby';
import path from 'path';
import ts from 'typescript';

// load ts/js files
export function loadFiles(cwd: string, pattern?: string) {
  const fileList = glob.sync([pattern || '**/*.(js|ts)', '!**/*.d.ts'], {
    cwd,
  });

  return fileList.filter(f => {
    // filter same name js/ts
    return !(f.endsWith('.js') && fileList.includes(f.substring(0, f.length - 2) + 'ts'));
  });
}

// clean same name js/ts
export function cleanJs(cwd: string) {
  const fileList: string[] = [];
  glob.sync(['**/*.ts', '!**/*.d.ts', '!**/node_modules'], { cwd }).forEach(f => {
    const jf = removeSameNameJs(path.resolve(cwd, f));
    if (jf) {
      fileList.push(jf);
    }
  });

  if (fileList.length) {
    console.info(`[egg-ts-helper] These file was deleted because the same name ts file was exist!\n`);
    console.info('  ' + fileList.join('\n  ') + '\n');
  }
}

// get moduleName by file path
export function getModuleObjByPath(f: string) {
  const props = f.split('/');
  // composing moduleName
  const moduleName = props.map(prop => camelProp(prop, 'upper')).join('');

  return {
    props,
    moduleName,
  };
}

// remove same name js
export function removeSameNameJs(f: string) {
  if (!f.endsWith('.ts') || f.endsWith('.d.ts')) {
    return;
  }

  const jf = f.substring(0, f.length - 2) + 'js';
  if (fs.existsSync(jf)) {
    fs.unlinkSync(jf);
    return jf;
  }
}

// find export node from sourcefile.
export function findExportNode(code: string) {
  let sourceFile;
  try {
    sourceFile = ts.createSourceFile('file.ts', code, ts.ScriptTarget.ES2017, true);
  } catch (e) {
    console.error(e);
    return;
  }

  const cache: Map<ts.__String, ts.Node> = new Map();
  const exportNodeList: ts.Node[] = [];
  let exportDefaultNode: ts.Node | undefined;

  eachSourceFile(sourceFile, node => {
    if (node.parent !== sourceFile) {
      return;
    }

    // each node in root scope
    if (modifierHas(node, ts.SyntaxKind.ExportKeyword)) {
      if (modifierHas(node, ts.SyntaxKind.DefaultKeyword)) {
        // export default
        exportDefaultNode = node;
      } else {
        // export variable
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(declare => exportNodeList.push(declare));
        } else {
          exportNodeList.push(node);
        }
      }
    } else if (ts.isVariableStatement(node)) {
      // cache variable statement
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          cache.set(declaration.name.escapedText, declaration.initializer);
        }
      }
    } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      // cache function declaration and class declaration
      cache.set(node.name.escapedText, node);
    } else if (ts.isExportAssignment(node)) {
      // export default {}
      exportDefaultNode = node.expression;
    }  else if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression)
    ) {
      if (ts.isPropertyAccessExpression(node.expression.left)) {
        const obj = node.expression.left.expression;
        const prop = node.expression.left.name;
        if (ts.isIdentifier(obj)) {
          if (obj.escapedText === 'exports') {
            // exports.xxx = {}
            exportNodeList.push(node.expression);
          } else if (obj.escapedText === 'module' && ts.isIdentifier(prop) && prop.escapedText === 'exports') {
            // module.exports = {}
            exportDefaultNode = node.expression.right;
          }
        }
      } else if (ts.isIdentifier(node.expression.left)) {
        // let exportData;
        // exportData = {};
        // export exportData
        cache.set(node.expression.left.escapedText, node.expression.right);
      }
    }
  });

  while (exportDefaultNode && ts.isIdentifier(exportDefaultNode) && cache.size) {
    const mid = cache.get(exportDefaultNode.escapedText);
    cache.delete(exportDefaultNode.escapedText);
    exportDefaultNode = mid;
  }

  return {
    exportDefaultNode,
    exportNodeList,
  };
}

// check kind in node.modifiers.
export function modifierHas(node: ts.Node, kind) {
  return node.modifiers && node.modifiers.find(mod => kind === mod.kind);
}

// each ast node
export function eachSourceFile(node: ts.Node, cb: (n: ts.Node) => any) {
  if (!ts.isSourceFile(node)) {
    const result = cb(node);
    if (result === false) {
      return;
    }
  }

  node.forEachChild((sub: ts.Node) => {
    eachSourceFile(sub, cb);
  });
}

// check whether module is exist
export function moduleExist(mod: string, cwd?: string) {
  const nodeModulePath = path.resolve(cwd || process.cwd(), 'node_modules', mod);
  try {
    return fs.existsSync(nodeModulePath) || require.resolve(mod);
  } catch (e) {
    return;
  }
}

// require modules
export function requireFile(url) {
  if (!fs.existsSync(url)) {
    return undefined;
  }

  let exp = require(url);
  if (exp.__esModule && 'default' in exp) {
    exp = exp.default;
  }

  if (typeof exp === 'function') {
    exp = exp();
  }

  return exp;
}

// format property
export function formatProp(prop: string) {
  return prop.replace(/[._-][a-z]/gi, s => s.substring(1).toUpperCase());
}

// like egg-core/file-loader
export function camelProp(property: string, caseStyle: string | ((...args: any[]) => string)): string {
  if (typeof caseStyle === 'function') {
    return caseStyle(property);
  }

  // camel transfer
  property = formatProp(property);
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
      break;
    default:
      break;
  }

  return first + property.substring(1);
}
