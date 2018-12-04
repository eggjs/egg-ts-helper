import chokidar from 'chokidar';
import d from 'debug';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import * as utils from './utils';
const debug = d('egg-ts-helper#index');
const dtsComment =
  '// This file is created by egg-ts-helper\n' +
  '// Do not modify this file!!!!!!!!!\n\n';

declare global {
  interface PlainObject {
    [key: string]: any;
  }
}

export interface BaseWatchItem {
  path: string;
  generator: string;
  enabled: boolean;
  trigger?: string[];
  pattern?: string;
}

export interface WatchItem extends PlainObject, BaseWatchItem { }

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
}

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
export type TsGenerator<T, U = GeneratorResult | GeneratorResult[] | void> = (
  config: T,
  baseConfig: TsHelperConfig,
  tsHelper: TsHelper,
) => U;

// partial and exclude some properties
type PartialExclude<T, K extends keyof T> = { [P in K]: T[P]; } & { [U in Exclude<keyof T, K>]?: T[U]; };

export const defaultConfig = {
  cwd: process.cwd(),
  framework: 'egg',
  typings: './typings',
  caseStyle: 'lower',
  autoRemoveJs: true,
  throttle: 500,
  watch: false,
  watchOptions: undefined,
  execAtInit: false,
  watchDirs: {},
  configFile: './tshelper.js',
};

export function formatWatchItem(watchItem: WatchItem) {
  return {
    trigger: [ 'add', 'unlink' ],
    generator: 'class',
    enabled: true,
    ...watchItem,
  };
}

// default watch dir
export function getDefaultWatchDirs(opt?: TsHelperOption) {
  const baseConfig: { [key: string]: PartialExclude<BaseWatchItem, 'path'> & PlainObject } = {};
  const watchConfig: { [key: string]: WatchItem | boolean } = {};

  // extend
  baseConfig.extend = {
    path: 'app/extend',
    interface: {
      context: 'Context',
      application: 'Application',
      agent: 'Application',
      request: 'Request',
      response: 'Response',
      helper: 'IHelper',
    },
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
    // only need to parse config.default.ts or config.ts
    pattern: 'config(.default|).(ts|js)',
    interface: 'EggAppConfig',
    generator: 'config',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // plugin
  baseConfig.plugin = {
    path: 'config',
    pattern: 'plugin*.(ts|js)',
    generator: 'plugin',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // service
  baseConfig.service = {
    path: 'app/service',
    interface: 'IService',
    generator: 'class',
  };

  // format config
  Object.keys(baseConfig).forEach(k => {
    watchConfig[k] = formatWatchItem(baseConfig[k] as WatchItem);
  });

  return watchConfig;
}

// preload generators
const gd = path.resolve(__dirname, './generators');
const generators = fs
  .readdirSync(gd)
  .filter(f => f.endsWith('.js'))
  .map(f => {
    const name = f.substring(0, f.lastIndexOf('.'));
    return {
      name,
      genFn: require(path.resolve(gd, name)).default,
    };
  });

export default class TsHelper extends EventEmitter {
  readonly config: TsHelperConfig;
  readonly watchDirs: string[];
  readonly watchNameList: string[];
  readonly generators: { [key: string]: TsGenerator<any> } = {};
  private watchers: chokidar.FSWatcher[] = [];
  private tickerMap: PlainObject = {};
  private watched: boolean = false;
  private cacheDist: PlainObject = {};
  private dtsFileList: string[] = [];

  // utils
  public utils = utils;

  constructor(options: TsHelperOption = {}) {
    super();

    const config = (this.config = this.configure(options));

    debug('framework is %s', config.framework);

    // add build-in generators
    generators.forEach(({ name, genFn }) => this.register(name, genFn));

    // cached watching name list
    this.watchNameList = Object.keys(config.watchDirs).filter(key => {
      const dir = config.watchDirs[key];
      return dir.hasOwnProperty('enabled')
        ? dir.enabled
        : true;
    });

    // format watching dirs
    this.watchDirs = this.watchNameList.map(key => {
      const item = config.watchDirs[key];
      const p = item.path.replace(/\/|\\/, path.sep);
      return getAbsoluteUrlByCwd(p, config.cwd);
    });

    // generate d.ts at init
    if (config.execAtInit) {
      debug('exec at init');
      this.build();
    }

    // start watching dirs
    if (config.watch) {
      this.watch();
    }
  }

  // register d.ts generator
  register<T extends TsGenConfig = TsGenConfig>(
    name: string,
    tsGen: TsGenerator<T>,
  ) {
    this.generators[name] = tsGen;
  }

  // build all dirs
  build() {
    this.watchDirs.map((_, i) => this.generateTs(i));
  }

  // init watcher
  watch() {
    if (this.watched) {
      return;
    }

    // create watcher for each dir
    this.watchDirs.forEach((item, index) => {
      const conf = this.config.watchDirs[this.watchNameList[index]];

      // glob only works with / in windows
      const watchGlob = path
        .join(item, conf.pattern || '**/*.(js|ts)')
        .replace(/\/|\\/g, '/');

      const watcher = chokidar.watch(watchGlob, this.config.watchOptions);

      // listen watcher event
      watcher.on('all', (event, p) => this.onChange(p, event, index));

      // auto remove js while ts was deleted
      if (this.config.autoRemoveJs) {
        watcher.on('unlink', utils.removeSameNameJs);
      }

      this.watchers.push(watcher);
    });

    this.watched = true;
  }

  // destroy
  destroy() {
    this.removeAllListeners();
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.length = 0;
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

  // configure
  // options > configFile > package.json
  private configure(options: TsHelperOption): TsHelperConfig {
    // base config
    const config = { ...defaultConfig, watchDirs: getDefaultWatchDirs(options) };
    const cwd = options.cwd || config.cwd;
    const configFile = options.configFile || config.configFile;
    const pkgInfo = utils.requireFile(path.resolve(cwd, './package.json')) || {};
    config.framework = options.framework || defaultConfig.framework;

    // read from package.json
    if (pkgInfo.egg) {
      mergeConfig(config, pkgInfo.egg.tsHelper);
    }

    // read from local file
    mergeConfig(config, utils.requireFile(getAbsoluteUrlByCwd(configFile, cwd)));
    debug('%o', config);

    // merge local config and options to config
    mergeConfig(config, options);
    debug('%o', options);

    // resolve config.typings to absolute url
    config.typings = getAbsoluteUrlByCwd(config.typings, cwd);

    return config as TsHelperConfig;
  }

  private generateTs(index: number, event?: string, file?: string) {
    const config = this.config;
    const dir = this.watchDirs[index];
    const watchName = this.watchNameList[index];
    const generatorConfig = config.watchDirs[watchName] as WatchItem;

    if (
      !generatorConfig.trigger ||
      (event && !generatorConfig.trigger.includes(event))
    ) {
      // check whether need to regenerate ts
      return;
    }

    const generator =
      typeof generatorConfig.generator === 'string'
        ? this.generators[generatorConfig.generator]
        : generatorConfig.generator;

    if (typeof generator !== 'function') {
      throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
    }

    const dtsDir = path.resolve(config.typings, path.relative(config.cwd, dir));
    let _fileList: string[] | undefined;
    const newConfig = {
      ...generatorConfig,
      dir,
      file,
      dtsDir,

      get fileList() {
        if (!_fileList) {
          _fileList = utils.loadFiles(dir, generatorConfig.pattern);
        }
        return _fileList;
      },
    };

    // execute generator
    const result = generator(newConfig, config, this);
    debug('generate ts file result : %o', result);
    if (!result) {
      return;
    }

    const resultList = Array.isArray(result) ? result : [ result ];
    resultList.map(item => {
      // check cache
      if (this.isCached(item.dist, item.content)) {
        return;
      }

      let isRemove = false;
      if (item.content) {
        // create file
        const dtsContent = `${dtsComment}import '${config.framework}';\n${item.content}`;
        debug('created d.ts : %s', item.dist);
        utils.writeFileSync(item.dist, dtsContent);
        this.emit('update', item.dist, file);
      } else {
        if (!fs.existsSync(item.dist)) {
          return;
        }

        // remove file
        debug('remove d.ts : %s', item.dist);
        fs.unlinkSync(item.dist);
        this.emit('remove', item.dist, file);
        isRemove = true;
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

  // trigger while file changed
  private onChange(p: string, event: string, index: number) {
    debug('%s trigger change', p);

    this.throttleFn(p, () => {
      debug('trigger change event in %s', index);
      this.emit('change', p);
      this.generateTs(index, event, p);
    });
  }

  // throttling execution
  private throttleFn(key, fn) {
    if (this.tickerMap[key]) {
      return;
    }

    this.tickerMap[key] = setTimeout(() => {
      fn();
      this.tickerMap[key] = null;
    }, this.config.throttle);
  }
}

export function createTsHelperInstance(options?: TsHelperOption) {
  return new TsHelper(options);
}

function getAbsoluteUrlByCwd(p: string, cwd: string) {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}

// merge ts helper options
function mergeConfig(base: TsHelperConfig, ...args: TsHelperOption[]) {
  args.forEach(opt => {
    if (!opt) {
      return;
    }

    Object.keys(opt).forEach(key => {
      if (key === 'watchDirs') {
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
              base.watchDirs[k] = formatWatchItem(item);
            }
          }
        });
      } else {
        base[key] = opt[key] === undefined ? base[key] : opt[key];
      }
    });
  });
}
