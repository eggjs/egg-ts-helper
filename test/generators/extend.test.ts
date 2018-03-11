import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
import {
  default as TsHelper,
  defaultConfig,
  GeneratorResult,
  TsGenerator,
} from '../../dist/';

function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

describe('generators/extend.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');
  const tsHelper = new TsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const extendGenerator = tsHelper.generators.extend as TsGenerator<
    any,
    GeneratorResult[]
  >;

  it('should works without error', () => {
    const result = extendGenerator(
      {
        ...defaultConfig.watchDirs.extend,
        dir: path.resolve(appDir, './app/extend/'),
        file: path.resolve(appDir, './app/extend/application.ts'),
      },
      tsHelper.config,
    );

    const item = result[0];
    assert(
      item.dist ===
        path.resolve(appDir, './typings/app/extend/application.d.ts'),
    );

    assert(
      item.content &&
        item.content.includes('interface Application') &&
        item.content.includes('typeof ExtendObject.isCool') &&
        item.content.includes('typeof ExtendObject.isNotCool'),
    );
  });

  it('should works without error with helper', () => {
    const result = extendGenerator(
      {
        ...defaultConfig.watchDirs.extend,
        dir: path.resolve(appDir, './app/extend/'),
        file: path.resolve(appDir, './app/extend/helper.ts'),
      },
      tsHelper.config,
    );

    const item = result[0];
    assert(
      item.content &&
        item.content.includes('interface IHelper') &&
        item.content.includes('typeof ExtendObject.isCool') &&
        item.content.includes('typeof ExtendObject.isNotCool'),
    );
  });
});
