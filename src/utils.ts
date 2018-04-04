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
      if (jf) { fileList.push(jf); }
    });

  if (fileList.length) {
    console.info(`[egg-ts-helper] These file was deleted because the same name ts file was exist!\n`);
    console.info('  ' + fileList.join('\n  ') + '\n');
  }
}

// get moduleName by file path
export function getModuleObjByPath(f: string) {
  const props = f.split('/').map(prop =>
    // transfer _ to uppercase
    prop.replace(/[._-][a-z]/gi, s => s.substring(1).toUpperCase()),
  );

  // composing moduleName
  const moduleName = props
    .map(prop => prop[0].toUpperCase() + prop.substring(1))
    .join('');

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
