import * as path from 'path';
import * as assert from 'power-assert';
import { getDefaultWatchDirs, WatchItem } from '../../dist';
import { findReturnPropertiesByTs } from '../../dist/generators/extend';
import { triggerGenerator } from './utils';

describe('generators/extend.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works with ts compiler', () => {
    let array = findReturnPropertiesByTs(path.resolve(__dirname, '../fixtures/app2/app/extend/application.ts')) || [];
    assert(array.includes('go'));
    assert(array.includes('isCool'));
    assert(array.includes('test-gg'));
    assert(array.includes('test-ggs'));
    assert(array.includes('isNotCool'));

    array = findReturnPropertiesByTs(path.resolve(__dirname, '../fixtures/app2/app/extend/context.ts')) || [];
    assert(array.includes('ctx'));
    assert(array.includes('isProd'));
    assert(array.includes('isAjax'));

    array = findReturnPropertiesByTs(path.resolve(__dirname, '../fixtures/app5/app/extend/whatever.ts')) || [];
    assert(array.includes('isCool'));
    assert(array.includes('isNotCool'));
  });

  it('should works with module.exports', () => {
    const array = findReturnPropertiesByTs(path.resolve(__dirname, '../fixtures/app2/app/extend/helper.ts')) || [];
    assert(array.includes('isCool'));
    assert(array.includes('isNotCool'));
  });

  it('should works without error', () => {
    const result = triggerGenerator('extend', appDir, 'application.ts');
    const item = result[0];
    assert(
      item.dist ===
        path.resolve(appDir, './typings/app/extend/application.d.ts'),
    );

    assert(item.content!.includes('../../../app/extend/application'));
    assert(item.content!.includes('interface Application'));
    assert(item.content!.includes('typeof ExtendObject.isCool'));
    assert(item.content!.includes('typeof ExtendObject.isNotCool'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = triggerGenerator('extend', newAppDir, 'application.ts');
    const item = result[0];
    assert(item.content!.includes('declare module \'larva\''));
  });

  it('should works without extend directory', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app8');
    const result = triggerGenerator('extend', newAppDir, 'application.ts');
    assert(result.length === 1);
  });

  it('should works without forwarding file', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app8');
    const result = triggerGenerator('extend', newAppDir);
    assert(result.length === Object.keys((getDefaultWatchDirs().extend as WatchItem).interface).length);
  });

  it('should not create property repeatability', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = triggerGenerator('extend', newAppDir, 'application.ts');
    const item = result[0];
    const matches = item.content!.match(/go: typeof/);
    assert(matches);
    assert(matches!.length === 1);
  });

  it('should not generate dts with unknown interface', () => {
    const result = triggerGenerator('extend', appDir, 'whatever.ts');
    assert(!result.length);
  });

  it('should not generate dts with empty extension', () => {
    const result = triggerGenerator('extend', appDir, 'request.ts');
    const item = result[0];
    assert(item.dist.includes('request.d.ts'));
    assert(!item.content);
  });

  it('should works without error with helper', () => {
    const result = triggerGenerator('extend', appDir, 'helper.ts');
    const item = result[0];
    assert(item.content!.includes('../../../app/extend/helper'));
    assert(item.content!.includes('interface IHelper'));
    assert(item.content!.includes('typeof ExtendObject.isCool'));
    assert(item.content!.includes('typeof ExtendObject.isNotCool'));
  });
});
