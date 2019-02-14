import chokidar from 'chokidar';
import d from 'debug';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import Watcher, { WatchItem } from './watcher';
import * as utils from './utils';
const debug = d('egg-ts-helper#index');
const dtsComment =
  '// This file is created by egg-ts-helper\n' +
  '// Do not modify this file!!!!!!!!!\n';

declare global {
  interface PlainObject {
    [key: string]: any;
  }
}

export interface TsHelperOption {
  cwd?: string;
  framework?: string;
  typings?: string;
  watchDirs?: { [key: string]: WatchItem | boolean };
  caseStyle?: string | ((...args: any[]) => string);
  watch?: boolean;
  watchOptions?: chokidar.WatchOptions;
  autoRemoveJs?: boolean;
  throttle?: number;
  execAtInit?: boolean;
  configFile?: string;
  silent?: boolean;
}

export type WatchItem = WatchItem;
export type TsHelperConfig = typeof defaultConfig;
export type TsGenConfig = {
  dir: string;
  dtsDir: string;
  fileList: string[],
  file?: string;
} & WatchItem;

export interface GeneratorResult {
  dist: string;
  content?: string;
}

export type TsGenerator<T = GeneratorResult | GeneratorResult[] | void> = ((
  config: TsGenConfig,
  baseConfig: TsHelperConfig,
  tsHelper: TsHelper,
) => T) & { defaultConfig?: WatchItem; };

export const defaultConfig = {
  cwd: utils.convertString(process.env.ETS_CWD, process.cwd()),
  framework: utils.convertString(process.env.ETS_FRAMEWORK, 'egg'),
  typings: utils.convertString(process.env.ETS_TYPINGS, './typings'),
  caseStyle: utils.convertString(process.env.ETS_CASE_STYLE, 'lower'),
  autoRemoveJs: utils.convertString(process.env.ETS_AUTO_REMOVE_JS, true),
  throttle: utils.convertString(process.env.ETS_THROTTLE, 500),
  watch: utils.convertString(process.env.ETS_WATCH, false),
  watchOptions: undefined,
  execAtInit: utils.convertString(process.env.ETS_EXEC_AT_INIT, false),
  silent: utils.convertString(process.env.ETS_SILENT, process.env.NODE_ENV === 'test'),
  watchDirs: {},
  configFile: utils.convertString(process.env.ETS_CONFIG_FILE, './tshelper'),
};

// default watch dir
export function getDefaultWatchDirs(opt?: TsHelperOption) {
  const baseConfig: { [key: string]: Partial<WatchItem> } = {};

  // extend
  baseConfig.extend = {
    path: 'app/extend',
    generator: 'extend',
  };

  // controller
  baseConfig.controller = {
    path: 'app/controller',
    interface: 'IController',
    generator: 'class',
  };

  // middleware
  baseConfig.middleware = {
    path: 'app/middleware',
    interface: 'IMiddleware',
    generator: 'object',
  };

  // proxy
  baseConfig.proxy = {
    path: 'app/proxy',
    interface: 'IProxy',
    generator: 'class',
    enabled: false,
  };

  // model
  baseConfig.model = {
    path: 'app/model',
    generator: 'function',
    interface: 'IModel',
    caseStyle: 'upper',
  };

  if (opt && utils.moduleExist('egg-sequelize', opt.cwd)) {
    baseConfig.model.interface = 'Sequelize';
    baseConfig.model.framework = 'sequelize';
  }

  // config
  baseConfig.config = {
    path: 'config',
    generator: 'config',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // plugin
  baseConfig.plugin = {
    path: 'config',
    generator: 'plugin',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // service
  baseConfig.service = {
    path: 'app/service',
    interface: 'IService',
    generator: 'class',
  };

  // egg
  baseConfig.egg = {
    path: 'app',
    generator: 'egg',
    watch: false,
  };

  return baseConfig as PlainObject;
}

export default class TsHelper extends EventEmitter {
  config: TsHelperConfig;
  watcherList: Watcher[];
  private cacheDist: PlainObject = {};
  private dtsFileList: string[] = [];

  // utils
  public utils = utils;

  constructor(options: TsHelperOption) {
    super();

    // configure ets
    this.configure(options);

    // init watcher
    this.initWatcher();

    // generate d.ts at init
    if (this.config.execAtInit) {
      debug('exec at init');
      this.build();
    }
  }

  // build all dirs
  build() {
    this.watcherList.forEach(watcher => watcher.execute());
    return this;
  }

  // destroy
  destroy() {
    this.removeAllListeners();
    this.watcherList.forEach(item => item.destroy());
    this.watcherList.length = 0;
  }

  // log
  log(info) {
    if (this.config.silent) {
      return;
    }

    utils.log(info);
  }

  // create oneForAll file
  createOneForAll(dist?: string) {
    const config = this.config;
    const oneForAllDist = (typeof dist === 'string') ? dist : path.join(config.typings, './ets.d.ts');
    const oneForAllDistDir = path.dirname(oneForAllDist);

    // create d.ts includes all types.
    const distContent = dtsComment + this.dtsFileList
      .map(file => {
        const importUrl = path
          .relative(oneForAllDistDir, file.replace(/\.d\.ts$/, ''))
          .replace(/\/|\\/g, '/');

        return `import '${importUrl.startsWith('.') ? importUrl : `./${importUrl}`}';`;
      })
      .join('\n');

    this.emit('update', oneForAllDist);
    utils.writeFileSync(oneForAllDist, distContent);
  }

  // init watcher
  private initWatcher() {
    const config = this.config;
    // format watching dirs
    this.watcherList = [];
    Object.keys(config.watchDirs).forEach(key => {
      const conf = config.watchDirs[key] as WatchItem;
      if (conf.hasOwnProperty('enabled') && !conf.enabled) {
        return;
      }

      const watcher = new Watcher({ ...conf, name: key }, this);
      this.watcherList.push(watcher);
      watcher.on('update', this.generateTs.bind(this));

      if (config.watch) {
        watcher.watch();
      }
    });
  }

  // configure
  // options > configFile > package.json
  private configure(options: TsHelperOption) {
    // base config
    const config = { ...defaultConfig, watchDirs: getDefaultWatchDirs(options) };
    const cwd = options.cwd || config.cwd;
    const configFile = options.configFile || config.configFile;
    const pkgInfo = utils.getPkgInfo(cwd);
    config.framework = options.framework || defaultConfig.framework;

    // read from package.json
    if (pkgInfo.egg) {
      mergeConfig(config, pkgInfo.egg.tsHelper);
    }

    // read from local file
    mergeConfig(config, utils.requireFile(utils.getAbsoluteUrlByCwd(configFile, cwd)));
    debug('%o', config);

    // merge local config and options to config
    mergeConfig(config, options);
    debug('%o', options);

    // resolve config.typings to absolute url
    config.typings = utils.getAbsoluteUrlByCwd(config.typings, cwd);

    this.config = config as TsHelperConfig;
  }

  private generateTs(result: GeneratorResult | GeneratorResult[], file?: string) {
    const config = this.config;
    const resultList = Array.isArray(result) ? result : [ result ];
    resultList.forEach(item => {
      // check cache
      if (this.isCached(item.dist, item.content)) {
        return;
      }

      let isRemove = false;
      if (item.content) {
        // create file
        const dtsContent = [
          dtsComment,
          `import '${config.framework}';`,
          item.content,
        ].join('\n');

        debug('created d.ts : %s', item.dist);
        utils.writeFileSync(item.dist, dtsContent);
        this.emit('update', item.dist, file);
        this.log(`create ${item.dist}`);
      } else {
        if (!fs.existsSync(item.dist)) {
          return;
        }

        // remove file
        isRemove = true;
        debug('remove d.ts : %s', item.dist);
        fs.unlinkSync(item.dist);
        this.emit('remove', item.dist, file);
        this.log(`delete ${item.dist}`);
      }

      // update distFiles
      this.updateDistFiles(item.dist, isRemove);
    });
  }

  private updateDistFiles(fileUrl: string, isRemove?: boolean) {
    const index = this.dtsFileList.indexOf(fileUrl);
    if (index >= 0) {
      if (isRemove) {
        this.dtsFileList.splice(index, 1);
      }
    } else {
      this.dtsFileList.push(fileUrl);
    }
  }

  private isCached(fileUrl, content) {
    const cacheItem = this.cacheDist[fileUrl];
    if (cacheItem === content) {
      // no need to create file content is not changed.
      return true;
    }

    this.cacheDist[fileUrl] = content;
    return false;
  }
}

export function createTsHelperInstance(options: TsHelperOption) {
  return new TsHelper(options);
}

// merge ts helper options
function mergeConfig(base: TsHelperConfig, ...args: TsHelperOption[]) {
  args.forEach(opt => {
    if (!opt) {
      return;
    }

    Object.keys(opt).forEach(key => {
      if (key !== 'watchDirs') {
        base[key] = opt[key] === undefined ? base[key] : opt[key];
        return;
      }

      const watchDirs = opt.watchDirs || {};
      Object.keys(watchDirs).forEach(k => {
        const item = watchDirs[k];
        if (typeof item === 'boolean') {
          if (base.watchDirs[k]) {
            base.watchDirs[k].enabled = item;
          }
        } else if (item) {
          if (base.watchDirs[k]) {
            Object.assign(base.watchDirs[k], item);
          } else {
            base.watchDirs[k] = item;
          }
        }
      });
    });
  });
}
