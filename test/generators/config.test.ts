import path from 'path';
import assert from 'power-assert';
import { GeneratorResult } from '../../dist/';
import { triggerGenerator } from './utils';

describe('generators/config.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('config', appDir);
    assert(result.content);
    assert(result.content!.includes(`import ExportConfigDefault from '../../config/config.default';`));
    assert(result.content!.includes(`import ExportConfigLocal from '../../config/config.local';`));
    assert(result.content!.includes(`import * as ExportConfigProd from '../../config/config.prod';`));
    assert(result.content!.includes(`type ConfigDefault = ReturnType<typeof ExportConfigDefault>;`));
    assert(result.content!.includes(`type ConfigLocal = typeof ExportConfigLocal;`));
    assert(result.content!.includes(`type ConfigProd = typeof ExportConfigProd;`));
    assert(result.content!.includes(`ConfigDefault & ConfigLocal & ConfigProd;`));
    assert(result.content!.includes(`declare module 'larva'`));
    assert(result.content!.includes(`interface EggAppConfig extends NewEggAppConfig { }\n`));
  });

  it('should works without error with file changed', () => {
    triggerGenerator<GeneratorResult>('config', appDir);
    const result = triggerGenerator<GeneratorResult>('config', appDir, 'config.default');
    assert(result.content);
    assert(result.content!.includes(`import ExportConfigDefault from '../../config/config.default';`));
    assert(result.content!.includes(`import ExportConfigLocal from '../../config/config.local';`));
    assert(result.content!.includes(`import * as ExportConfigProd from '../../config/config.prod';`));
    assert(result.content!.includes(`type ConfigDefault = ReturnType<typeof ExportConfigDefault>;`));
    assert(result.content!.includes(`type ConfigLocal = typeof ExportConfigLocal;`));
    assert(result.content!.includes(`type ConfigProd = typeof ExportConfigProd;`));
    assert(result.content!.includes(`ConfigDefault & ConfigLocal & ConfigProd;`));
    assert(result.content!.includes(`declare module 'larva'`));
    assert(result.content!.includes(`interface EggAppConfig extends NewEggAppConfig { }`));
  });

  it('should works while file was not exist', () => {
    triggerGenerator<GeneratorResult>('config', appDir);
    const result = triggerGenerator<GeneratorResult>('config', appDir, 'config.xxx');
    assert(!result.content!.includes(`config.xxx';`));
    assert(result.content!.includes(`import ExportConfigDefault from '../../config/config.default';`));
    assert(result.content!.includes(`import ExportConfigLocal from '../../config/config.local';`));
  });

  it('should works while only has config.ts', () => {
    const result = triggerGenerator<GeneratorResult>('config', path.resolve(__dirname, '../fixtures/app2'));
    assert(result.content);
    assert(result.content!.includes(`import ExportConfig from '../../config/config';`));
    assert(result.content!.includes(`type Config = ReturnType<typeof ExportConfig>;`));
    assert(result.content!.includes(`Config`));
  });

  it('should works without empty config.ts', () => {
    const result = triggerGenerator<GeneratorResult>('config', path.resolve(__dirname, '../fixtures/app4'));
    assert(!result.content);
  });
});
