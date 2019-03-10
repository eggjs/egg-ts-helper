import { TsGenConfig, TsHelperConfig } from '..';
import path from 'path';

export const isPrivate = true;

// declare global namespace Egg
export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  return {
    dist: path.resolve(config.dtsDir, 'index.d.ts'),
    content:
      `export * from '${baseConfig.framework}';\n` +
      'export as namespace Egg;\n',
  };
}
