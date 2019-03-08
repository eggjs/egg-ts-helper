// generator for custom loader
import { default as TsHelper, TsGenConfig, TsHelperConfig } from '..';
import { declMapping } from '../config';
import Watcher from '../watcher';
import * as utils from '../utils';
import path from 'path';

export const isPrivate = true;

export const defaultConfig = {
  directory: 'config',
  execAtInit: true,
  pattern: [
    'config(.default|).(ts|js)',
    'plugin(.local|.default|).(ts|js)',
  ],
};

const customWatcherPrefix = 'custom-';
const DeclareMapping = utils.pickFields<keyof typeof declMapping>(declMapping, [ 'ctx', 'app' ]);

export default function(config: TsGenConfig, baseConfig: TsHelperConfig, tsHelper: TsHelper) {
  const isInit = !!config.file;
  const createCustomLoader = (eggInfo: utils.EggInfoResult) => {
    const eggConfig = eggInfo.config || {};
    const newCustomWatcherList: string[] = [];

    if (eggConfig.customLoader) {
      Object.keys(eggConfig.customLoader).forEach(key => {
        const loaderConfig = eggConfig.customLoader[key];
        if (!loaderConfig || !loaderConfig.directory || !DeclareMapping[loaderConfig.inject]) return;

        // custom d.ts name
        const name = `${customWatcherPrefix}${key}`;
        newCustomWatcherList.push(name);

        // create a custom watcher
        tsHelper.registerWatcher(name, {
          distName: `${name}.d.ts`,
          directory: loaderConfig.directory,
          caseStyle: loaderConfig.caseStyle || 'lower',
          interface: declMapping[key],
          declareTo: `${DeclareMapping[loaderConfig.inject]}.${key}`,
          generator: 'auto',
        });
      });
    }

    // collect watcher which is need to remove.
    const removeList: Watcher[] = [];
    tsHelper.watcherList.forEach(w => {
      if (w.name.startsWith(customWatcherPrefix) && !newCustomWatcherList.includes(w.name)) {
        removeList.push(w);
      }
    });

    // remove watcher and old d.ts
    return removeList.map(w => {
      tsHelper.destroyWatcher(w.name);
      return { dist: path.resolve(w.dtsDir, `${w.name}.d.ts`) };
    });
  };

  if (!isInit) {
    return createCustomLoader(utils.getEggInfo(baseConfig.cwd));
  } else {
    // async
    return utils.getEggInfo<'async'>(baseConfig.cwd, { async: true })
      .then(eggInfo => createCustomLoader(eggInfo));
  }
}
