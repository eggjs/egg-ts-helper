import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { TsGenerator, TsGenConfig, TsHelperConfig, default as TsHelper } from './';
import * as utils from './utils';
import d from 'debug';
const debug = d('egg-ts-helper#watcher');
export interface BaseWatchItem {
  path: string;
  generator: string;
  enabled: boolean;
  trigger: Array<'add' | 'unlink' | 'change'>;
  pattern: string;
}

export interface WatchItem extends PlainObject, BaseWatchItem { }

// preload build-in generators
const gd = path.resolve(__dirname, './generators');
const generators: PlainObject = {};
fs
  .readdirSync(gd)
  .filter(f => f.endsWith('.js'))
  .map(f => {
    const name = f.substring(0, f.lastIndexOf('.'));
    generators[name] = require(path.resolve(gd, name)).default;
  });

export default class Watcher extends EventEmitter {
  name: string;
  dir: string;
  dtsDir: string;
  config: TsHelperConfig;
  generator: TsGenerator;
  fsWatcher?: chokidar.FSWatcher;
  throttleTick: any = null;
  throttleStack: string[] = [];

  constructor(
    public options: WatchItem & { name: string; },
    public helper: TsHelper,
  ) {
    super();
    this.init();
  }

  public init() {
    this.config = this.helper.config;
    this.name = this.options.name;
    const p = this.options.path.replace(/\/|\\/, path.sep);
    this.generator = this.getGenerator(this.options);
    this.dir = utils.getAbsoluteUrlByCwd(p, this.config.cwd);
    this.dtsDir = path.resolve(
      this.config.typings,
      path.relative(this.config.cwd, this.dir),
    );
  }

  public destroy() {
    if (this.fsWatcher) {
      this.fsWatcher.close();
    }

    clearTimeout(this.throttleTick);
    this.throttleTick = null;
    this.throttleStack.length = 0;
    this.removeAllListeners();
  }

  // watch file change
  public watch() {
    if (this.fsWatcher) {
      this.fsWatcher.close();
    }

    // glob only works with / in windows
    const watchGlob = path
      .join(this.dir, this.options.pattern || '**/*.(js|ts)')
      .replace(/\/|\\/g, '/');

    const watcher = chokidar.watch(watchGlob, this.config.watchOptions);

    // listen watcher event
    this.options.trigger.forEach(evt => {
      watcher.on(evt, this.onChange.bind(this));
    });

    // auto remove js while ts was deleted
    if (this.config.autoRemoveJs) {
      watcher.on('unlink', utils.removeSameNameJs);
    }

    this.fsWatcher = watcher;
  }

  // execute generator
  public execute(file?: string): any {
    debug('execution %s', file);
    const options = this.options;
    let _fileList: string[] | undefined;
    const newConfig: TsGenConfig = {
      ...this.options,
      file,
      dir: this.dir,
      dtsDir: this.dtsDir,

      get fileList() {
        if (!_fileList) {
          _fileList = utils.loadFiles(this.dir, options.pattern);
        }
        return _fileList;
      },
    };

    const result = this.generator(newConfig, this.config, this.helper);
    if (result) {
      this.emit('update', result, file);
    }

    return result;
  }

  // on file change
  private onChange(filePath: string) {
    debug('file changed %s %o', filePath, this.throttleStack);
    if (!this.throttleStack.includes(filePath)) {
      this.throttleStack.push(filePath);
    }

    if (this.throttleTick) {
      return;
    }

    this.throttleTick = setTimeout(() => {
      while (this.throttleStack.length) {
        this.execute(this.throttleStack.pop()!);
      }

      this.throttleTick = null;
    }, this.config.throttle);
  }

  // get generator
  private getGenerator(genConfig: WatchItem): TsGenerator {
    const type = typeof genConfig.generator;
    const typeIsString = type === 'string';
    let generator = typeIsString ? generators[genConfig.generator] : genConfig.generator;

    if (!generator && typeIsString) {
      try {
        // try to load generator as module path
        const generatorPath = genConfig.generator.startsWith('.')
          ? path.join(this.config.cwd, genConfig.generator)
          : genConfig.generator;

        generator = require(generatorPath);
      } catch (e) {
        // do nothing
      }
    }

    if (typeof generator !== 'function') {
      throw new Error(`generator: ${genConfig.generator} not exist!!`);
    }

    return generator;
  }
}
