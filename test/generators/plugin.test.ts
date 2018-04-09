import * as path from 'path';
import * as assert from 'power-assert';
import { GeneratorResult } from '../../dist/';
import { triggerGenerator } from './utils';

describe('generators/plugin.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('plugin', appDir);
    assert(result.content.match(/egg-cors/g).length === 1);
    assert(result.content.includes('import \'egg-yoyo\''));
    assert(!result.content.includes('import \'egg-view-vue-ssr\''));
  });
});
