import * as chokidar from 'chokidar';
import * as d from 'debug';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
const debug = d('egg-ts-helper#index');

declare global {
  interface PlainObject {
    [key: string]: any;
  }
}

export interface WatchItem extends PlainObject {
  path: string;
  generator: string;
  trigger: string[];
  enabled: boolean;
}

export interface TsHelperOption {
  cwd?: string;
  framework?: string;
  typings?: string;
  watchDirs?: { [key: string]: WatchItem };
  caseStyle?: string;
  watch?: boolean;
  autoRemoveJs?: boolean;
  throttle?: number;
  execAtInit?: boolean;
  configFile?: string;
}

export type TsHelperConfig = typeof defaultConfig;
export type TsGenConfig = {
  dir: string;
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

export const defaultConfig = {
  cwd: process.cwd(),
  framework: 'egg',
  typings: './typings',
  caseStyle: 'lower',
  autoRemoveJs: true,
  throttle: 500,
  watch: true,
  execAtInit: true,
  watchDirs: {},
  configFile: './tshelper.js',
};

// default watch dir
export function getDefaultWatchDirs() {
  return {
    extend: {
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
      trigger: ['add', 'change', 'unlink'],
      enabled: true,
    },

    controller: {
      path: 'app/controller',
      interface: 'IController',
      generator: 'class',
      trigger: ['add', 'unlink'],
      enabled: true,
    },

    proxy: {
      path: 'app/proxy',
      interface: 'IProxy',
      generator: 'class',
      trigger: ['add', 'unlink'],
      enabled: false,
    },

    service: {
      path: 'app/service',
      interface: 'IService',
      generator: 'class',
      trigger: ['add', 'unlink'],
      enabled: true,
    },
  };
}

// preload generators
const gd = path.resolve(__dirname, './generators');
const generators = fs
  .readdirSync(gd)
  .filter(f => !f.endsWith('.d.ts'))
  .map(
    f => require(path.resolve(gd, f.substring(0, f.lastIndexOf('.')))).default,
  );

export default class TsHelper extends EventEmitter {
  readonly config: TsHelperConfig;
  readonly watchDirs: string[];
  readonly watchNameList: string[];
  readonly generators: { [key: string]: TsGenerator<any> } = {};
  private watcher: chokidar.FSWatcher;
  private tickerMap: PlainObject = {};

  constructor(options: TsHelperOption = {}) {
    super();

    const config = (this.config = this.mergeConfig(options));

    debug('framework is %s', config.framework);

    // add build-in generators
    generators.forEach(gen => gen(this));

    // cached watch list
    this.watchNameList = Object.keys(config.watchDirs).filter(key => {
      const dir = config.watchDirs[key];
      return Object.prototype.hasOwnProperty.call(dir, 'enabled')
        ? dir.enabled
        : true;
    });

    // format watch dirs
    this.watchDirs = this.watchNameList.map(key => {
      const item = config.watchDirs[key];
      const p = item.path.replace(/\/|\\/, path.sep);
      return getAbsoluteUrlByCwd(p, config.cwd);
    });

    // generate d.ts at init
    if (config.execAtInit) {
      debug('exec at init');
      process.nextTick(() => {
        this.watchDirs.forEach((_, i) => this.generateTs(i));
      });
    }

    // start watching dirs
    if (config.watch) {
      this.initWatcher();
    }
  }

  // register d.ts generator
  register<T extends TsGenConfig = TsGenConfig>(
    name: string,
    tsGen: TsGenerator<T>,
  ) {
    this.generators[name] = tsGen;
  }

  // configure
  private mergeConfig(options: TsHelperOption): TsHelperConfig {
    // base config
    const config = { ...defaultConfig };

    // merge local config
    const localConfigFile = getAbsoluteUrlByCwd(
      options.configFile || config.configFile,
      options.cwd || config.cwd,
    );

    // read local config
    if (fs.existsSync(localConfigFile)) {
      let exp = require(localConfigFile);
      if (typeof exp === 'function') {
        exp = exp();
      }
      Object.assign(options, exp);
    }

    // merge local config and options to config
    Object.assign(config, options, {
      watchDirs: getDefaultWatchDirs(),
    });

    // merge watchDirs
    if (options.watchDirs) {
      const watchDirs = options.watchDirs;
      Object.keys(watchDirs).forEach(key => {
        const item = watchDirs[key];
        if (typeof item === 'boolean') {
          if (config.watchDirs[key]) {
            config.watchDirs[key].enabled = item;
          }
        } else if (item) {
          config.watchDirs[key] = item;
        }
      });
    }

    // resolve config.typings to absolute url
    config.typings = getAbsoluteUrlByCwd(config.typings, config.cwd);

    // get framework name from option or package.json
    const pkgInfoPath = path.resolve(config.cwd, './package.json');
    if (fs.existsSync(pkgInfoPath)) {
      const pkgInfo = require(pkgInfoPath);
      config.framework =
        options.framework ||
        (pkgInfo.egg ? pkgInfo.egg.framework : null) ||
        defaultConfig.framework;
    }

    return config as TsHelperConfig;
  }

  // init watcher
  private initWatcher() {
    const config = this.config;
    // format watchDirs
    const watchDirs = this.watchDirs.map(item => {
      // glob only works with / in windows
      return path.join(item, './**/*.(js|ts)').replace(/\/|\\/g, '/');
    });

    const watcher = (this.watcher = chokidar.watch(watchDirs));

    // listen watcher event
    watcher.on('all', (event, p) => this.onChange(p, event));

    // auto remove js while ts was deleted
    if (config.autoRemoveJs) {
      watcher.on('unlink', p => {
        if (!p.endsWith('.ts')) {
          return;
        }

        const jsPath = p.substring(0, p.lastIndexOf('.')) + '.js';
        if (fs.existsSync(jsPath)) {
          debug('auto remove js file %s', jsPath);
          fs.unlinkSync(jsPath);
        }
      });
    }
  }

  // find file path in watchDirs
  private findInWatchDirs(p: string) {
    for (let i = 0; i < this.watchDirs.length; i++) {
      if (p.indexOf(this.watchDirs[i]) < 0) {
        continue;
      }

      return i;
    }

    return -1;
  }

  private generateTs(index: number, event?: string, file?: string) {
    const config = this.config;
    const dir = this.watchDirs[index];
    const generatorConfig = config.watchDirs[
      this.watchNameList[index]
    ] as WatchItem;

    if (event && !generatorConfig.trigger.includes(event)) {
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

    const result = generator({ ...generatorConfig, dir, file }, config);
    debug('generate ts file result : %o', result);
    if (result) {
      const resultList = Array.isArray(result) ? result : [result];
      resultList.forEach(item => {
        if (item.content) {
          debug('created d.ts : %s', item.dist);
          mkdirp.sync(path.dirname(item.dist));
          fs.writeFileSync(
            item.dist,
            '// This file was auto created by egg-ts-helper\n' +
              '// Do not modify this file!!!!!!!!!\n\n' +
              item.content,
          );
          this.emit('update', item.dist);
        } else if (fs.existsSync(item.dist)) {
          debug('remove d.ts : %s', item.dist);
          fs.unlinkSync(item.dist);
          this.emit('remove', item.dist);
        }
      });
    }
  }

  // trigger while file changed
  private onChange(p: string, event: string) {
    debug('%s trigger change', p);

    // istanbul ignore next
    if (p.endsWith('d.ts')) {
      return;
    }

    const k = p.substring(0, p.lastIndexOf('.'));
    if (this.tickerMap[k]) {
      return;
    }

    // throttle 500ms
    this.tickerMap[k] = setTimeout(() => {
      const index = this.findInWatchDirs(p);
      // istanbul ignore next
      if (index < 0) {
        return;
      }

      debug('trigger change event in %s', index);
      this.emit('change', p);
      this.generateTs(index, event, p);
      this.tickerMap[k] = null;
    }, this.config.throttle);
  }
}

function getAbsoluteUrlByCwd(p: string, cwd: string) {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}
