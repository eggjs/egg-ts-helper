import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import classGenerator from './generators/class';
import extendGenerator from './generators/extend';

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
}

export type TsHelperConfig = typeof defaultConfig;
export type TsGenConfig = {
  dir: string;
  changedFile?: string;
} & WatchItem;
export interface GeneratorResult {
  dist: string;
  content?: string;
}
export type TsGenerator<T> = (
  config: T,
  baseConfig: TsHelperConfig,
) => GeneratorResult | GeneratorResult[] | void;

export const defaultConfig = {
  cwd: process.cwd(),
  framework: 'egg',
  typings: './typings',
  caseStyle: 'lower',
  autoRemoveJs: true,
  throttle: 500,
  watch: true,
  watchDirs: {
    extend: {
      path: 'app/extend',
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

export default class TsHelper extends EventEmitter {
  readonly config: TsHelperConfig;
  readonly watchDirs: string[];
  readonly watchNameList: string[];
  private tickerMap: PlainObject = {};
  private watcher: chokidar.FSWatcher;
  private generators: { [key: string]: TsGenerator<any> } = {};

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

    this.config = config as TsHelperConfig;

    // filter
    this.watchNameList = Object.keys(this.config.watchDirs).filter(
      key => !!this.config.watchDirs[key],
    );

    this.watchDirs = this.watchNameList.map(key => {
      const item = this.config.watchDirs[key];
      const p = item.path.replace(/\/|\\/, path.sep);
      return getAbsoluteUrlByCwd(p, config.cwd);
    });

    // add built-in ts generator
    classGenerator(this);
    extendGenerator(this);

    // generate d.ts on start
    process.nextTick(() => {
      this.watchDirs.forEach((_, i) => this.generateTs(i));
    });

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
    const watcher = (this.watcher = chokidar.watch(this.watchDirs));

    // listen watcher event
    watcher.on('ready', () => {
      watcher.on('add', p => this.onChange(p, 'add'));
      watcher.on('change', p => this.onChange(p, 'change'));
      watcher.on('unlink', (p: string) => {
        if (config.autoRemoveJs && p.endsWith('.ts')) {
          // auto remove js while ts was deleted
          const jsPath = p.substring(0, p.lastIndexOf('.')) + '.js';
          if (fs.existsSync(jsPath)) {
            fs.unlinkSync(jsPath);
          }
        }

        this.onChange(p, 'unlink');
      });
    });
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

  private generateTs(index: number, type?: string, changedFile?: string) {
    const config = this.config;
    const dir = this.watchDirs[index];
    const generatorConfig = config.watchDirs[this.watchNameList[index]] as WatchItem;

    if (type && !generatorConfig.trigger.includes(type)) {
      // check whether need to regenerate ts
      return;
    }

    const generator = this.generators[generatorConfig.generator];
    if (!generator) {
      throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
    }

    const result = generator({ ...generatorConfig, dir, changedFile }, config);
    if (result) {
      const resultList = Array.isArray(result) ? result : [result];
      resultList.forEach(item => {
        if (item.content) {
          mkdirp.sync(path.dirname(item.dist));
          fs.writeFileSync(
            item.dist,
            '// This file was auto generated by ts-helper\n' +
              '// Do not modify this file!!!!!!!!!\n\n' +
              item.content,
          );
          this.emit('update', item.dist);
        } else if (fs.existsSync(item.dist)) {
          fs.unlinkSync(item.dist);
          this.emit('remove', item.dist);
        }
      });
    }
  }

  // trigger while file changed
  private onChange(p: string, type: string) {
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

      this.emit('change', p);
      this.generateTs(index, type, p);
      this.tickerMap[k] = null;
    }, this.config.throttle);
  }
}

function getAbsoluteUrlByCwd(p: string, cwd: string) {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}
