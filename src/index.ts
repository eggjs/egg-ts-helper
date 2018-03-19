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
  watchDirs: {
    extend: {
      path: 'app/extend',
      interface: {
        context: 'Context',
        application: 'Application',
        request: 'Request',
        response: 'Response',
        helper: 'IHelper',
      },
      generator: 'extend',
      trigger: ['add', 'change', 'unlink'],
    },

    controller: {
      path: 'app/controller',
      interface: 'IController',
      generator: 'class',
      trigger: ['add', 'unlink'],
    },

    proxy: {
      path: 'app/proxy',
      interface: 'IProxy',
      generator: 'class',
      trigger: ['add', 'unlink'],
    },

    service: {
      path: 'app/service',
      interface: 'IService',
      generator: 'class',
      trigger: ['add', 'unlink'],
    },
  },
};

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
    const config = {
      ...defaultConfig,
      ...options,
    };

    // merge watchDirs
    config.watchDirs = {
      ...defaultConfig.watchDirs,
      ...options.watchDirs,
    };

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

    debug('framework is %s', config.framework);
    this.config = config as TsHelperConfig;

    // add build-in generators
    generators.forEach(gen => gen(this));

    // cached watch list
    this.watchNameList = Object.keys(this.config.watchDirs).filter(
      key => !!this.config.watchDirs[key],
    );

    // format watch dirs
    this.watchDirs = this.watchNameList.map(key => {
      const item = this.config.watchDirs[key];
      const p = item.path.replace(/\/|\\/, path.sep);
      return getAbsoluteUrlByCwd(p, config.cwd);
    });

    // generate d.ts at init
    if (this.config.execAtInit) {
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

    const generator = this.generators[generatorConfig.generator];
    if (!generator) {
      throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
    }

    const result = generator({ ...generatorConfig, dir, file }, config);
    debug('generate ts file result : %o', result);
    if (result) {
      const resultList = Array.isArray(result) ? result : [result];
      resultList.forEach(item => {
        if (item.content) {
          debug('generated d.ts : %s', item.dist);
          mkdirp.sync(path.dirname(item.dist));
          fs.writeFileSync(
            item.dist,
            '// This file was auto generated by ts-helper\n' +
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
