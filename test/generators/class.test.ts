import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
import { GeneratorResult } from '../../dist/';
import { triggerGenerator } from './utils';

describe('generators/class.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('controller', appDir);
    assert(
      result.dist ===
        path.resolve(appDir, './typings/app/controller/index.d.ts'),
    );
    assert(result.content.includes('../../../app/controller/home'));
    assert(result.content.includes('interface IController'));
    assert(result.content.includes('home: Home;'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = triggerGenerator<GeneratorResult>('controller', newAppDir);
    assert(result.content.includes('declare module \'larva\''));
  });
});
