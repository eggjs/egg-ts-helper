import path from 'path';
import {
  default as TsHelper,
  GeneratorResult,
  getDefaultWatchDirs,
  TsGenerator,
  WatchItem,
} from '../../dist/';
import { loadFiles } from '../../dist/utils';

export function triggerGenerator<T extends GeneratorResult[] | GeneratorResult = GeneratorResult[]>(
  name: string,
  appDir: string,
  file?: string,
  extra?: any,
) {
  const defaultWatchDirs = getDefaultWatchDirs();
  const tsHelper = new TsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const watchDir = defaultWatchDirs[name] as WatchItem;
  const generator = tsHelper.generators[watchDir.generator] as TsGenerator<any, T>;
  const dir = path.resolve(appDir, watchDir.path);
  const dtsDir = path.resolve(tsHelper.config.typings, path.relative(tsHelper.config.cwd, dir));

  return generator(
    {
      ...watchDir,
      dir,
      file: file ? path.resolve(dir, file) : '',
      fileList: loadFiles(dir, watchDir.pattern),
      dtsDir,
      ...extra,
    },
    tsHelper.config,
    tsHelper,
  );
}
