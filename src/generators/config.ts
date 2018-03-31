import * as d from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// export default function(tsHelper: TsHelper) {
//   tsHelper.register('config', (config, baseConfig) => {

//   });
// }

export function findObjects(f: string) {
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
}
