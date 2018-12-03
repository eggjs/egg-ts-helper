import fs from 'fs';
import path from 'path';
import assert = require('assert');
import ts from 'typescript';
import * as utils from '../dist/utils';

describe('utils.test.ts', () => {
  const appDir = path.resolve(__dirname, './fixtures/app7');
  it('should load file without error', () => {
    const fileList = utils.loadFiles(appDir);
    assert(fileList.includes('test.ts'));
    assert(!fileList.includes('test.js'));
    assert(fileList.includes('go.js'));
    assert(!fileList.includes('index.d.ts'));
  });

  it('should require file without error', () => {
    const exp = utils.requireFile(path.resolve(appDir, './go.js'));
    const exp2 = utils.requireFile(path.resolve(appDir, './test2.js'));
    const exp3 = utils.requireFile(path.resolve(appDir, './test3.js'));
    assert(exp.hello);
    assert(exp2.hello);
    assert(exp3.hello);
  });

  it('should removeSameNameJs without error', () => {
    assert(!utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test.d.ts')));
    assert(!utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test2.js')));
    fs.writeFileSync(path.resolve(__dirname, './fixtures/app9/test.js'), '');
    assert(utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test.ts')));
  });

  it('should check module exist without error', () => {
    assert(!!utils.moduleExist('chokidar'));
    assert(!utils.moduleExist('egg-sequelize'));
  });

  it('should findExportNode without error', () => {
    let exportResult = utils.findExportNode('export default {};')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('export default class ABC {}')!;
    assert(ts.isClassDeclaration(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('export default function() {};')!;
    assert(ts.isFunctionLike(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('const abc = {};export default abc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('function abc() {};export default abc;')!;
    assert(ts.isFunctionLike(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('const abc = {};const ccc = abc;export default ccc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('const abc = {};export = abc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('export const abc = 666;export function ccc() {}')!;
    assert(exportResult.exportNodeList.length === 2);
    assert(ts.isVariableDeclaration(exportResult.exportNodeList[0]));
    assert(ts.isFunctionLike(exportResult.exportNodeList[1]));

    exportResult = utils.findExportNode('module.exports = {};')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));

    exportResult = utils.findExportNode('exports.abc = {}; exports.ccc = function() {}')!;
    assert(exportResult.exportNodeList.length === 2);
    assert(ts.isObjectLiteralExpression((exportResult.exportNodeList[0] as ts.BinaryExpression).right));
    assert(ts.isFunctionLike((exportResult.exportNodeList[1] as ts.BinaryExpression).right));

    exportResult = utils.findExportNode('const abc = {}; let bbb; bbb = abc; export default bbb;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefaultNode!));
  });
});
