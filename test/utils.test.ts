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
    utils.cleanJs(appPath);
    assert(fs.existsSync(path.resolve(appPath, './test2.js')));
    assert(!fs.existsSync(path.resolve(appPath, './test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/test.js')));
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
    assert(!utils.moduleExist('egg-sequelize'));
  });

  it('should getImportStr without error', () => {
    let importContext = utils.getImportStr('./fixtures/app/typings', './fixtures/app/controller/test.ts', 'Test');
    assert(importContext === "import Test from '../controller/test';");

    importContext = utils.getImportStr('./fixtures/app/typings/app', './fixtures/app/service/test.ts', 'Test');
    assert(importContext === "import Test from '../../service/test';");

    importContext = utils.getImportStr('./fixtures/app/typings', './fixtures/app/controller/test.ts', 'Test', true);
    assert(importContext === "import * as Test from '../controller/test';");

    importContext = utils.getImportStr('./fixtures/app/typings', './fixtures/app/controller/test.js', 'Test');
    assert(importContext === "import Test = require('../controller/test');");

    importContext = utils.getImportStr('./fixtures/app/typings', './fixtures/app/controller/test.js', 'Test', true);
    assert(importContext === "import Test = require('../controller/test');");
  });

  it('should getModuleObjByPath without error', () => {
    let result = utils.getModuleObjByPath('abc/fff.ts');
    assert(result.moduleName === 'AbcFff');

    result = utils.getModuleObjByPath('abc/bbb.ts');
    assert(result.moduleName === 'AbcBbb');
  });

  it('should findExportNode without error', () => {
    let exportResult = utils.findExportNode('export default {};')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('export default class ABC {}')!;
    assert(ts.isClassDeclaration(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('export default function() {};')!;
    assert(ts.isFunctionLike(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('const abc = {};export default abc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('function abc() {};export default abc;')!;
    assert(ts.isFunctionLike(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('const abc = {};const ccc = abc;export default ccc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('const abc = {};export = abc;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('export const abc = 666;export function ccc() {}')!;
    assert(exportResult.exportList.size === 2);
    assert(ts.isNumericLiteral(exportResult.exportList.get('abc')!.node));
    assert(ts.isFunctionLike(exportResult.exportList.get('ccc')!.node));

    exportResult = utils.findExportNode('module.exports = {};')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));

    exportResult = utils.findExportNode('exports.abc = {}; exports.ccc = function() {}')!;
    assert(exportResult.exportList.size === 2);
    assert(ts.isObjectLiteralExpression(exportResult.exportList.get('abc')!.node));
    assert(ts.isFunctionLike(exportResult.exportList.get('ccc')!.node));

    exportResult = utils.findExportNode('const abc = {}; let bbb; bbb = abc; export default bbb;')!;
    assert(ts.isObjectLiteralExpression(exportResult.exportDefault!.node));
  });

  it('should findKVList without error', () => {
    let code = `
      let abc = 123;
      abc = { aa: true };
      const bbc = abc;
      bbc.xxbb = true;
      abc.aa = 123;
    `;
    let sourceFile = ts.createSourceFile('file.ts', code, ts.ScriptTarget.ES2017, true);
    let kv = utils.findKVList(sourceFile.statements);
    const bbc = kv.get('bbc') as any;
    assert(bbc.properties[1].initializer.kind === ts.SyntaxKind.TrueKeyword);
    assert(ts.isNumericLiteral(bbc.properties[0].initializer));

    code = `
      let abc = 123;
      abc = { aa: true };
      const ccc = { ccc: {} };
      ccc.xxbb = true;
      abc.aa = ccc.ccc;
      ccc.ccc.aaa = 123;
    `;
    sourceFile = ts.createSourceFile('file.ts', code, ts.ScriptTarget.ES2017, true);
    kv = utils.findKVList(sourceFile.statements);
    const ccc = kv.get('ccc') as any;
    console.info(ccc.properties);
    assert(ccc.properties.length === 2);
    assert(ccc.properties[0].name.getText() === 'ccc');
    assert(ts.isNumericLiteral(ccc.properties[0].initializer));
    assert(ccc.properties[1].name.getText() === 'xxbb');
    assert(ccc.properties[1].initializer!.kind === ts.SyntaxKind.TrueKeyword);

    const abc = kv.get('abc') as any;
    assert(abc.properties.length === 1);
    assert(abc.properties[0].name.getText() === 'aa');
    assert(abc.properties[0].initializer.kind === ts.SyntaxKind.ObjectLiteralExpression);
    assert(abc.properties[0].initializer.properties.length === 1);
    assert(abc.properties[0].initializer.properties[0].name.getText() === 'aaa');
    assert(abc.properties[0].initializer.properties[0].initializer.kind === ts.SyntaxKind.NumericLiteral);
  });
});
