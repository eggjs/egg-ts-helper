import * as path from 'path';
import {
  default as TsHelper,
  defaultConfig,
  GeneratorResult,
  getDefaultWatchDirs,
  TsGenerator,
} from '../../dist/';

export function triggerGenerator<
  T extends GeneratorResult[] | GeneratorResult = GeneratorResult[]
>(name: string, appDir: string, file?: string) {
  const defaultWatchDirs = getDefaultWatchDirs();
  const tsHelper = new TsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const watchDir = defaultWatchDirs[name];
  const generator = tsHelper.generators[watchDir.generator] as TsGenerator<any, T>;
  const dir = path.resolve(appDir, watchDir.path);
  return generator(
    {
      ...watchDir,
      dir,
      file: file ? path.resolve(dir, file) : '',
      dtsDir: path.resolve(
        tsHelper.config.typings,
        path.relative(tsHelper.config.cwd, dir),
      ),
    },
    tsHelper.config,
  );
}
