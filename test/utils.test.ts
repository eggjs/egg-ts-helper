import fs from 'fs';
import path from 'path';
import assert = require('assert');
import ts from 'typescript';
import del from 'del';
import * as utils from '../dist/utils';
import { tsc } from './utils';

describe('utils.test.ts', () => {
  const appDir = path.resolve(__dirname, './fixtures/app7');
  it('should load file without error', () => {
    const fileList = utils.loadFiles(appDir);
    assert(fileList.includes('test.ts'));
    assert(!fileList.includes('test.js'));
    assert(fileList.includes('go.js'));
    assert(!fileList.includes('index.d.ts'));
  });

  it('should clean js without error', async () => {
    const appPath = path.resolve(__dirname, './fixtures/app9');
    await tsc(appPath);
    assert(fs.existsSync(path.resolve(appPath, './test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/test.js')));

    assert(fs.existsSync(path.resolve(appPath, './testtsx.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/testtsx.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/testtsx.js')));

    utils.cleanJs(appPath);
    assert(fs.existsSync(path.resolve(appPath, './test2.js')));
    assert(!fs.existsSync(path.resolve(appPath, './test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/test.js')));

    assert(!fs.existsSync(path.resolve(appPath, './testtsx.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/testtsx.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/testtsx.js')));
  });

  it('should convertString without error', () => {
    assert(utils.convertString<boolean>('true', false) === true);
    assert(utils.convertString<string>('true', '123') === 'true');
    assert(utils.convertString<number>('1234', 123) === 1234);
    assert(utils.convertString<number>('asd', 123) === 123);
    assert(utils.convertString<number>(undefined, 123) === 123);
    assert(utils.convertString<number>({} as any, 123) === 123);
    assert(typeof utils.convertString<any>('123', {}) === 'object');
  });

  it('should checkMaybeIsJsProj without error', () => {
    const cwd = path.resolve(__dirname, './fixtures/init');
    utils.writeJsConfig(cwd);
    assert(utils.checkMaybeIsJsProj(cwd));
    del.sync(path.resolve(cwd, './jsconfig.json'));
    assert(!utils.checkMaybeIsJsProj(cwd));
  });

  it('should write tsconfig without error', () => {
    const cwd = path.resolve(__dirname, './fixtures/init');
    const jsonPath = path.resolve(cwd, './tsconfig.json');
    del.sync(jsonPath);
    utils.writeTsConfig(cwd);
    fs.existsSync(jsonPath);
    const json = JSON.parse(fs.readFileSync(jsonPath).toString());
    json.mySpecConfig = true;
    assert(!!json.compilerOptions);
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

    // should not cover exist file
    utils.writeTsConfig(cwd);
    const json2 = JSON.parse(fs.readFileSync(jsonPath).toString());
    assert(json2.mySpecConfig);
    del.sync(jsonPath);
  });

  it('should write jsconfig without error', () => {
    const cwd = path.resolve(__dirname, './fixtures/init');
    const jsonPath = path.resolve(cwd, './jsconfig.json');
    del.sync(jsonPath);
    utils.writeJsConfig(cwd);
    fs.existsSync(jsonPath);
    const json = JSON.parse(fs.readFileSync(jsonPath).toString());
    json.mySpecConfig = true;
    assert(!!json.include);
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

    // should not cover exist file
    utils.writeJsConfig(cwd);
    const json2 = JSON.parse(fs.readFileSync(jsonPath).toString());
    assert(json2.mySpecConfig);
    del.sync(jsonPath);
  });

  it('should require file without error', () => {
    const exp = utils.requireFile(path.resolve(appDir, './go.js'));
    const exp2 = utils.requireFile(path.resolve(appDir, './test2.js'));
    const exp3 = utils.requireFile(path.resolve(appDir, './test3.js'));
    assert(exp.hello);
    assert(typeof exp2 === 'function');
    assert(typeof exp3 === 'function');
  });

  it('should removeSameNameJs without error', () => {
    assert(!utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test.d.ts')));
    assert(!utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test2.js')));
    fs.writeFileSync(path.resolve(__dirname, './fixtures/app9/test.js'), '');
    assert(utils.removeSameNameJs(path.resolve(__dirname, './fixtures/app9/test.ts')));
  });

  it('should check module exist without error', () => {
    assert(!!utils.moduleExist('chokidar'));
    assert(!utils.moduleExist('egg-asd'));
  });

  it('should getImportStr without error', () => {
    const cwd = path.resolve(__dirname, './fixtures/app/');
    let importContext = utils.getImportStr(path.resolve(cwd, 'typings'), path.resolve(cwd, 'controller/test.ts'), 'Test');
    assert(importContext === "import Test from '../controller/test';");

    importContext = utils.getImportStr(path.resolve(cwd, 'typings/app'), path.resolve(cwd, 'service/test.ts'), 'Test');
    assert(importContext === "import Test from '../../service/test';");

    importContext = utils.getImportStr(path.resolve(cwd, 'app/typings'), path.resolve(cwd, 'app/controller/test.ts'), 'Test', true);
    assert(importContext === "import * as Test from '../controller/test';");

    importContext = utils.getImportStr(path.resolve(cwd, 'typings'), path.resolve(cwd, 'controller/test.js'), 'Test');
    assert(importContext === "import Test = require('../controller/test');");

    importContext = utils.getImportStr(path.resolve(cwd, 'typings'), path.resolve(cwd, 'controller/test.js'), 'Test', true);
    assert(importContext === "import Test = require('../controller/test');");

    importContext = utils.getImportStr(cwd, path.resolve(__dirname, './fixtures/app7/test4.js'), 'Test', true);
    assert(importContext === "import * as Test from '../app7/test4';");
  });

  it('should getModuleObjByPath without error', () => {
    let result = utils.getModuleObjByPath('abc/fff.ts');
    assert(result.moduleName === 'AbcFff');

    result = utils.getModuleObjByPath('abc/bbb.ts');
    assert(result.moduleName === 'AbcBbb');
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

  it('should get eggInfo without error', async () => {
    const eggInfo = utils.getEggInfo(path.resolve(__dirname, './fixtures/real-unittest'));
    assert(eggInfo.plugins);
    assert(eggInfo.config);
    const asyncEggInfo = await utils.getEggInfo<'async'>(path.resolve(__dirname, './fixtures/real-unittest'));
    assert(asyncEggInfo.plugins);
    assert(asyncEggInfo.config);
    const customEggInfo = await utils.getEggInfo<'async'>(path.resolve(__dirname, './fixtures/custom'));
    assert(customEggInfo.plugins);
    assert(customEggInfo.config!.customLoader);
  });

  it('should parse json without error', async () => {
    let json = utils.parseJson('');
    assert(json);
    json = utils.parseJson('{ "abc": 123 }');
    assert(json.abc);
    json = utils.parseJson('{ "abc: 123 }');
    assert(json);
  });

  it('should load tsconfig without error', async () => {
    const tsConfig = utils.loadTsConfig(path.resolve(__dirname, './fixtures/real/tsconfig'));
    assert(tsConfig);
    assert(tsConfig.strict);
    assert(tsConfig.target);
  });
});
