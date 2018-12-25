import path from 'path';
import TsHelper, { GeneratorResult } from '../../dist/';
import assert = require('assert');

export function triggerGenerator<T extends GeneratorResult[] | GeneratorResult = GeneratorResult[]>(
  name: string,
  appDir: string,
  file?: string,
  extra?: any,
) {
  const tsHelper = new TsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const watcher = tsHelper.watcherList.find(watcher => watcher.name === name)!;
  assert(watcher, 'watcher is not exist');
  const dir = path.resolve(appDir, watcher.options.path);
  watcher.init({
    ...watcher.options,
    ...extra,
  });

  return watcher.execute(file ? path.resolve(dir, file) : '') as any as T;
}
