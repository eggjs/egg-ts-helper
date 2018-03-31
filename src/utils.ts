import * as fs from 'fs';
import * as glob from 'globby';
import * as ts from 'typescript';

// load ts/js files
export function loadFiles(cwd: string, pattern: string = '**/*.(js|ts)') {
  const fileList = glob.sync([pattern, '!**/*.d.ts'], {
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
