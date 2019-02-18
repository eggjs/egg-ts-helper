import path from 'path';
import assert = require('assert');
import fs from 'fs';
import { GeneratorResult } from '../../dist/';
import { getPluginInfo } from '../../dist/generators/plugin';
import { triggerGenerator } from './utils';

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

  it('should works with empty plugin file', () => {
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, '../fixtures/app2'));
    assert(result.dist);
    assert(!result.content);
  });

  it('should get plugin info without error', () => {
    let plugins = getPluginInfo(path.resolve(__dirname, '../fixtures/real-unittest'));
    assert(plugins.pluginList.length);
    assert(!plugins.pluginList.includes('egg-static'));
    assert(plugins.pluginList.includes('egg-view'));

    const otherPlugin = path.resolve(__dirname, '../fixtures/real-unittest/config/plugin.other.ts');
    fs.writeFileSync(otherPlugin, 'export const view = false;');
    plugins = getPluginInfo(otherPlugin);
    assert(!plugins.pluginList.includes('egg-static'));
    assert(!plugins.pluginList.includes('egg-view'));
  });
});
