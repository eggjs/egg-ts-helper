import path from 'path';
import assert = require('assert');
import { GeneratorResult } from '../../dist/';
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
});
