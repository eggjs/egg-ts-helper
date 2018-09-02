import * as fs from 'fs';
import * as glob from 'globby';
import * as path from 'path';
import * as ts from 'typescript';

// load ts/js files
export function loadFiles(cwd: string, pattern?: string) {
  const fileList = glob.sync([pattern || '**/*.(js|ts)', '!**/*.d.ts'], {
    cwd,
  });

  return fileList.filter(f => {
    // filter same name js/ts
    return !(
      f.endsWith('.js') &&
      fileList.includes(f.substring(0, f.length - 2) + 'ts')
    );
  });
}

// clean same name js/ts
export function cleanJs(cwd: string) {
  const fileList: string[] = [];
  glob
    .sync(['**/*.ts', '!**/*.d.ts', '!**/node_modules'], { cwd })
    .forEach(f => {
      const jf = removeSameNameJs(path.resolve(cwd, f));
      if (jf) {
        fileList.push(jf);
      }
    });

  if (fileList.length) {
    console.info(
      `[egg-ts-helper] These file was deleted because the same name ts file was exist!\n`,
    );
    console.info('  ' + fileList.join('\n  ') + '\n');
  }
}

// get moduleName by file path
export function getModuleObjByPath(f: string) {
  const props = f.split('/').map(formatProp);

  // composing moduleName
  const moduleName = props
    .map(prop => camelProp(prop, 'upper'))
    .join('');

  return {
    props,
    moduleName,
  };
}

// format property
export function formatProp(prop: string) {
  return prop.replace(/[._-][a-z]/gi, s => s.substring(1).toUpperCase());
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

// parse ts file to ast
export function getSourceFile(f: string) {
  const code = fs.readFileSync(f, {
    encoding: 'utf-8',
  });

  try {
    return ts.createSourceFile(f, code, ts.ScriptTarget.ES2017, true);
  } catch (e) {
    console.error(e);
    return;
  }
}

// check whether node was module.exports
export function isModuleExports(node: ts.Node) {
  if (ts.isPropertyAccessExpression(node)) {
    const obj = node.expression;
    const prop = node.name;
    return (
      ts.isIdentifier(obj) &&
      obj.escapedText === 'module' &&
      ts.isIdentifier(prop) &&
      prop.escapedText === 'exports'
    );
  }

  return false;
}

// check kind in node.modifiers.
export function modifierHas(node: ts.Node, kind) {
  return node.modifiers && node.modifiers.find(mod => kind === mod.kind);
}

// each ast node
export function eachSourceFile(node: ts.Node, cb: (n: ts.Node) => any) {
  const result = cb(node);
  if (result === false) {
    return;
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

// like egg-core/file-loader
export function camelProp(property: string, caseStyle: string): string {
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
      break;
  }

  return first + property.substring(1);
}
