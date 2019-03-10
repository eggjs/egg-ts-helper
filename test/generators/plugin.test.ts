import path from 'path';
import assert = require('assert');
import { GeneratorResult } from '../../dist/';
import * as utils from '../../dist/utils';
import { triggerGenerator } from './utils';
import mm from 'egg-mock';

describe('generators/plugin.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/real-unittest');

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(result.content!.includes('import \'egg-view\''));
    assert(!result.content!.includes('import \'egg-static\''));
    assert(result.content!.includes('static?: EggPluginItem'));
    assert(result.content!.includes('view?: EggPluginItem'));
  });

  it('should remove file if eggInfo.plugins is undefined', () => {
    mm(utils, 'getEggInfo', (_, options) => (options.callback({})));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(!result.content);
  });

  it('should remove file if eggInfo.plugins is empty object', () => {
    mm(utils, 'getEggInfo', (_, options) => (options.callback({ plugins: {} })));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(!result.content);
  });

  it('should format plugin name', () => {
    mm(utils, 'getEggInfo', (_, options) => (options.callback({
      plugins: { 'kiss-ass': { package: 'kiss-ass', enable: true, from: 'kiss-ass' } },
    })));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(result.content!.includes('\'kiss-ass\'?: EggPluginItem'));
  });
});
