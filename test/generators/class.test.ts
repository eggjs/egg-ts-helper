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

describe('generators/class.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');
  const tsHelper = new TsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const classGenerator = tsHelper.generators.class as TsGenerator<
    any,
    GeneratorResult
  >;

  it('should works without error', () => {
    const result = classGenerator(
      {
        ...defaultConfig.watchDirs.controller,
        dir: path.resolve(appDir, './app/controller/'),
      },
      tsHelper.config,
    );

    assert(
      result.dist === path.resolve(appDir, './typings/app/controller/index.d.ts'),
    );
    assert(result.content.includes('../../../app/controller/home'));
    assert(result.content.includes('interface IController'));
    assert(result.content.includes('home: Home;'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = classGenerator(
      {
        ...defaultConfig.watchDirs.extend,
        dir: path.resolve(newAppDir, './app/extend/'),
      },
      new TsHelper({
        cwd: newAppDir,
        watch: false,
        execAtInit: false,
      }).config,
    );

    assert(result.content.includes('declare module \'larva\''));
  });
});
