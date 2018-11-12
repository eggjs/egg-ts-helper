import * as chokidar from 'chokidar';
import * as d from 'debug';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as utils from './utils';
const debug = d('egg-ts-helper#index');

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
  caseStyle?: string | Function;
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
    trigger: ['add', 'unlink'],
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
    interfaceHandle: val => `typeof ${val}`,
    generator: 'class',
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
    generator: 'class',
    interface: 'IModel',
    caseStyle: 'upper',
    interfaceHandle: val => `ReturnType<typeof ${val}>`,
  };

  if (opt && utils.moduleExist('egg-sequelize', opt.cwd)) {
    baseConfig.model.interface = 'Sequelize';
    baseConfig.model.framework = 'sequelize';
  }

  // config
  baseConfig.config = {
    path: 'config',
    pattern: 'config*.(ts|js)',
    interface: 'EggAppConfig',
    generator: 'config',
    trigger: ['add', 'unlink', 'change'],
  };

  // plugin
  baseConfig.plugin = {
    path: 'config',
    pattern: 'plugin*.(ts|js)',
    generator: 'plugin',
    trigger: ['add', 'unlink', 'change'],
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
  .filter(f => !f.endsWith('.d.ts'))
  .map(f => require(path.resolve(gd, f.substring(0, f.lastIndexOf('.')))).default);

export default class TsHelper extends EventEmitter {
  readonly config: TsHelperConfig;
  readonly watchDirs: string[];
  readonly watchNameList: string[];
  readonly generators: { [key: string]: TsGenerator<any> } = {};
  private watchers: chokidar.FSWatcher[] = [];
  private tickerMap: PlainObject = {};
  private watched: boolean = false;
  private cacheDist: PlainObject = {};

  constructor(options: TsHelperOption = {}) {
    super();

    const config = (this.config = this.configure(options));

    debug('framework is %s', config.framework);

    // add build-in generators
    generators.forEach(gen => gen(this));

    // cached watching name list
    this.watchNameList = Object.keys(config.watchDirs).filter(key => {
      const dir = config.watchDirs[key];
      return Object.prototype.hasOwnProperty.call(dir, 'enabled')
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
    this.watchDirs.forEach((_, i) => this.generateTs(i));
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
    mergeConfig(
      config,
      utils.requireFile(getAbsoluteUrlByCwd(configFile, cwd)),
    );
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
    const result = generator(newConfig, config);
    debug('generate ts file result : %o', result);
    if (!result) {
      return;
    }

    const resultList = Array.isArray(result) ? result : [result];
    resultList.forEach(item => {
      if (
        this.cacheDist[item.dist] &&
        this.cacheDist[item.dist].content === item.content
      ) {
        return;
      }

      this.cacheDist[item.dist] = item;
      if (item.content) {
        debug('created d.ts : %s', item.dist);
        mkdirp.sync(path.dirname(item.dist));
        fs.writeFileSync(
          item.dist,
          '// This file was auto created by egg-ts-helper\n' +
            '// Do not modify this file!!!!!!!!!\n\n' +
            `import '${config.framework}'; // Make sure ts to import ${config.framework} declaration at first\n` +
            item.content,
        );
        this.emit('update', item.dist, file);
      } else if (fs.existsSync(item.dist)) {
        debug('remove d.ts : %s', item.dist);
        fs.unlinkSync(item.dist);
        this.emit('remove', item.dist, file);
      }
    });
  }

  // trigger while file changed
  private onChange(p: string, event: string, index: number) {
    debug('%s trigger change', p);

    const k = p.substring(0, p.lastIndexOf('.'));
    if (this.tickerMap[k]) {
      return;
    }

    // throttle 500ms
    this.tickerMap[k] = setTimeout(() => {
      debug('trigger change event in %s', index);
      this.emit('change', p);
      this.generateTs(index, event, p);
      this.tickerMap[k] = null;
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
