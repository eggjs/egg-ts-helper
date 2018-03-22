import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
import {
  default as TsHelper,
  defaultConfig,
  GeneratorResult,
  getDefaultWatchDirs,
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
  const defaultWatchDirs = getDefaultWatchDirs();

  const extendGenerator = tsHelper.generators.extend as TsGenerator<
    any,
    GeneratorResult[]
  >;

  it('should works without error', () => {
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
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

    assert(item.content.includes('../../../app/extend/application'));
    assert(item.content.includes('interface Application'));
    assert(item.content.includes('typeof ExtendObject.isCool'));
    assert(item.content.includes('typeof ExtendObject.isNotCool'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
        dir: path.resolve(newAppDir, './app/extend/'),
        file: path.resolve(newAppDir, './app/extend/application.ts'),
      },
      new TsHelper({
        cwd: newAppDir,
        watch: false,
        execAtInit: false,
      }).config,
    );

    const item = result[0];
    assert(item.content.includes('declare module \'larva\''));
  });

  it('should not generate dts with unknown interface', () => {
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
        dir: path.resolve(appDir, './app/extend/'),
        file: path.resolve(appDir, './app/extend/whatever.ts'),
      },
      tsHelper.config,
    );

    assert(!result.length);
  });

  it('should not exist while babylon parse error', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
        dir: path.resolve(newAppDir, './app/extend/'),
        file: path.resolve(newAppDir, './app/extend/agent.ts'),
      },
      tsHelper.config,
    );

    assert(!result.length);
  });

  it('should not generate dts with empty extension', () => {
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
        dir: path.resolve(appDir, './app/extend/'),
        file: path.resolve(appDir, './app/extend/request.ts'),
      },
      tsHelper.config,
    );

    const item = result[0];
    assert(item.dist.includes('request.d.ts'));
    assert(!item.content);
  });

  it('should works without error with helper', () => {
    const result = extendGenerator(
      {
        ...defaultWatchDirs.extend,
        dir: path.resolve(appDir, './app/extend/'),
        file: path.resolve(appDir, './app/extend/helper.ts'),
      },
      tsHelper.config,
    );

    const item = result[0];
    assert(item.content.includes('../../../app/extend/helper'));
    assert(item.content.includes('interface IHelper'));
    assert(item.content.includes('typeof ExtendObject.isCool'));
    assert(item.content.includes('typeof ExtendObject.isNotCool'));
  });
});
