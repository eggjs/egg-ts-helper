import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import classGenerator from './generators/class';

declare global {
  interface PlainObject {
    [key: string]: any;
  }
}

export interface WatchItem extends PlainObject {
  path: string;
  generator: string;
}

export interface TsHelperOption {
  cwd?: string;
  framework?: string;
  typings?: string;
  watchDirs?: WatchItem[];
  caseStyle?: string;
  watch?: boolean;
  autoRemoveJs?: boolean;
  throttle?: number;
}

export type TsHelperConfig = typeof defaultConfig;
export type TsGenConfig = { dir: string } & WatchItem;
export type TsGenerator<T> = (
  config: T,
  baseConfig: TsHelperConfig,
) => { dist: string; content?: string } | void;

export const defaultConfig = {
  cwd: process.cwd(),
  framework: 'egg',
  typings: './typings',
  caseStyle: 'lower',
  autoRemoveJs: true,
  throttle: 500,
  watch: true,
  watchDirs: [
    {
      path: 'app/controller',
      interface: 'IController',
      generator: 'class',
    },
    {
      path: 'app/proxy',
      interface: 'IProxy',
      generator: 'class',
    },
    {
      path: 'app/service',
      interface: 'IService',
      generator: 'class',
    },
  ],
};

export default class TsHelper extends EventEmitter {
  readonly config: TsHelperConfig;
  readonly watchDirs: string[];
  private tickerMap: PlainObject = {};
  private watcher: chokidar.FSWatcher;
  private generators: { [key: string]: TsGenerator<any> } = {};

  constructor(options: TsHelperOption = {}) {
    super();
    const config = {
      ...defaultConfig,
      ...options,
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
    this.watchDirs = this.config.watchDirs.map(item => {
      const p = item.path.replace(/\/|\\/, path.sep);
      return getAbsoluteUrlByCwd(p, config.cwd);
    });

    // add built-in ts generator
    classGenerator(this);

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
      watcher.on('add', p => this.onChange(p));
      watcher.on('unlink', (p: string) => {
        if (config.autoRemoveJs && p.endsWith('.ts')) {
          // auto remove js while ts was deleted
          const jsPath = p.substring(0, p.lastIndexOf('.')) + '.js';
          if (fs.existsSync(jsPath)) {
            fs.unlinkSync(jsPath);
          }
        }

        this.onChange(p);
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

  private generateTs(index: number) {
    const config = this.config;
    const dir = this.watchDirs[index];
    const generatorConfig = config.watchDirs[index];
    const generator = this.generators[generatorConfig.generator];

    if (!generator) {
      throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
    }

    const result = generator({ ...generatorConfig, dir }, config);
    if (result) {
      if (result.content) {
        mkdirp.sync(path.dirname(result.dist));
        fs.writeFileSync(result.dist, result.content);
        this.emit('update', result.dist);
      } else if (fs.existsSync(result.dist)) {
        fs.unlinkSync(result.dist);
        this.emit('remove', result.dist);
      }
    }
  }

  // trigger while file changed
  private onChange(p: string) {
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
      this.generateTs(index);
      this.tickerMap[k] = null;
    }, this.config.throttle);
  }
}

function getAbsoluteUrlByCwd(p: string, cwd: string) {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}
