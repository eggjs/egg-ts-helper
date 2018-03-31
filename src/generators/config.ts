import * as ts from 'typescript';
import * as utils from '../utils';

// export default function(tsHelper: TsHelper) {
//   tsHelper.register('config', (config, baseConfig) => {

//   });
// }

export function findObjects(f: string) {
  const sourceFile = utils.getSourceFile(f);
  if (!sourceFile) {
    return;
  }

  let exportElement;
  utils.eachSourceFile(sourceFile, node => {
    if (ts.isExportAssignment(node)) {
      exportElement = node;
      return false;
    }
  });

  console.info(exportElement);
}
