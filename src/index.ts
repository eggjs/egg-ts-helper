import chokidar from 'chokidar';
import d from 'debug';
import assert from 'assert';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { declMapping, dtsComment } from './config';
import Watcher, { WatchItem } from './watcher';
import * as utils from './utils';
const debug = d('egg-ts-helper#index');

declare global {
  interface PlainObject<T = any> {
    [key: string]: T;
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
  name: string;
  dir: string;
  dtsDir: string;
  fileList: string[],
  file?: string;
} & WatchItem;

export interface GeneratorResult {
  dist: string;
  content?: string;
}

type GeneratorAllResult = GeneratorResult | GeneratorResult[];
type GeneratorCbResult<T> = T | Promise<T>;

export type TsGenerator<T = GeneratorAllResult | void> = ((
  config: TsGenConfig,
  baseConfig: TsHelperConfig,
  tsHelper: TsHelper,
) => GeneratorCbResult<T>) & { defaultConfig?: WatchItem; };

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
    directory: 'app/extend',
    generator: 'extend',
  };

  // controller
  baseConfig.controller = {
    directory: 'app/controller',
    interface: declMapping.controller,
    generator: 'class',
  };

  // middleware
  baseConfig.middleware = {
    directory: 'app/middleware',
    interface: declMapping.middleware,
    generator: 'object',
  };

  // proxy
  baseConfig.proxy = {
    directory: 'app/proxy',
    interface: 'IProxy',
    generator: 'class',
    enabled: false,
  };

  // model
  baseConfig.model = {
    directory: 'app/model',
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
    directory: 'config',
    generator: 'config',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // plugin
  baseConfig.plugin = {
    directory: 'config',
    generator: 'plugin',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // service
  baseConfig.service = {
    directory: 'app/service',
    interface: declMapping.service,
    generator: 'class',
  };

  // egg
  baseConfig.egg = {
    directory: 'app',
    generator: 'egg',
    watch: false,
  };

  // custom loader
  baseConfig.customLoader = {
    generator: 'custom',
  };

  return baseConfig as PlainObject;
}
export default class TsHelper extends EventEmitter {
  config: TsHelperConfig;
  watcherList: Map<string, Watcher> = new Map();
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
  }

  // build all watcher
  build() {
    this.watcherList.forEach(watcher => watcher.execute());
    return this;
  }

  // destroy
  destroy() {
    this.removeAllListeners();
    this.watcherList.forEach(item => item.destroy());
    this.watcherList.clear();
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
    Object.keys(this.config.watchDirs).forEach(key => {
      this.registerWatcher(key, this.config.watchDirs[key]);
    });
  }

  // destroy watcher
  destroyWatcher(name: string) {
    if (this.watcherList.has(name)) {
      this.watcherList.get(name)!.destroy();
      this.watcherList.delete(name);
    }
  }

  // register watcher
  registerWatcher(name: string, watchConfig: WatchItem) {
    this.destroyWatcher(name);
    if (watchConfig.hasOwnProperty('enabled') && !watchConfig.enabled) {
      return;
    }

    const options = {
      name,
      execAtInit: this.config.execAtInit,
      ...watchConfig,
    };

    if (!this.config.watch) {
      options.watch = false;
    }

    const watcher = new Watcher(this);
    watcher.on('update', this.generateTs.bind(this));
    watcher.init(options);
    this.watcherList.set(name, watcher);
    return watcher;
  }

  // configure
  // options > configFile > package.json
  private configure(options: TsHelperOption) {
    if (options.cwd) {
      options.cwd = utils.getAbsoluteUrlByCwd(options.cwd, defaultConfig.cwd);
    }

    // base config
    const config = { ...defaultConfig, watchDirs: getDefaultWatchDirs(options) };
    config.cwd = options.cwd || config.cwd;
    const configFile = options.configFile || config.configFile;
    const pkgInfo = utils.getPkgInfo(config.cwd);
    config.framework = options.framework || defaultConfig.framework;

    // read from package.json
    if (pkgInfo.egg) {
      mergeConfig(config, pkgInfo.egg.tsHelper);
    }

    // read from local file
    mergeConfig(config, utils.requireFile(utils.getAbsoluteUrlByCwd(configFile, config.cwd)));
    debug('%o', config);

    // merge local config and options to config
    mergeConfig(config, options);
    debug('%o', options);

    // resolve config.typings to absolute url
    config.typings = utils.getAbsoluteUrlByCwd(config.typings, config.cwd);

    this.config = config as TsHelperConfig;
  }

  private generateTs(result: GeneratorCbResult<GeneratorAllResult>, file: string | undefined, startTime: number) {
    const updateTs = (result: GeneratorAllResult, file?: string) => {
      const config = this.config;
      const resultList = Array.isArray(result) ? result : [ result ];

      for (const item of resultList) {
        // check cache
        if (this.isCached(item.dist, item.content)) {
          return;
        }

        if (item.content) {
          // create file
          const dtsContent = `${dtsComment}\nimport '${config.framework}';\n${item.content}`;
          utils.writeFileSync(item.dist, dtsContent);
          this.emit('update', item.dist, file);
          this.log(`create ${path.relative(this.config.cwd, item.dist)} (${Date.now() - startTime}ms)`);
          this.updateDistFiles(item.dist);
        } else {
          if (!fs.existsSync(item.dist)) {
            return;
          }

          // remove file
          fs.unlinkSync(item.dist);
          this.emit('remove', item.dist, file);
          this.log(`delete ${path.relative(this.config.cwd, item.dist)}`);
          this.updateDistFiles(item.dist, true);
        }
      }
    };

    if (typeof (result as any).then === 'function') {
      return (result as Promise<GeneratorAllResult>)
        .then(r => updateTs(r, file))
        .catch(e => { this.log(e.message); });
    } else {
      updateTs(result as GeneratorAllResult, file);
    }
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
    if (content && cacheItem === content) {
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
          // check private generator
          assert(!Watcher.isPrivateGenerator(item.generator), `${item.generator} is a private generator, can not configure in config file`);

          // compatible for deprecated field
          if (item.path) {
            item.directory = item.path;
          }

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
