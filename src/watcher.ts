import path from 'path';
import chokidar from 'chokidar';
import assert from 'assert';
import { EventEmitter } from 'events';
import { TsGenerator, TsGenConfig, TsHelperConfig, default as TsHelper } from './';
import * as utils from './utils';
import d from 'debug';
const debug = d('egg-ts-helper#watcher');
let generators;

export interface BaseWatchItem {
  path: string;
  generator: string;
  enabled: boolean;
  trigger: Array<'add' | 'unlink' | 'change'>;
  pattern: string;
}

export interface WatchItem extends PlainObject, BaseWatchItem { }

interface WatcherOptions extends WatchItem {
  name: string;
}

export default class Watcher extends EventEmitter {
  name: string;
  dir: string;
  options: WatcherOptions;
  dtsDir: string;
  config: TsHelperConfig;
  generator: TsGenerator;
  fsWatcher?: chokidar.FSWatcher;
  throttleTick: any = null;
  throttleStack: string[] = [];

  constructor(options: WatcherOptions, public helper: TsHelper) {
    super();
    this.init(options);
  }

  public init(options: WatcherOptions) {
    const generatorName = options.generator || 'class';
    this.config = this.helper.config;
    this.name = options.name;
    this.generator = this.getGenerator(generatorName);
    this.options = {
      trigger: [ 'add', 'unlink' ],
      generator: generatorName,
      pattern: '**/*.(ts|js)',
      ...this.generator.defaultConfig,
      ...options,
    };

    const baseDir = options.path.replace(/\/|\\/, path.sep);
    this.dir = utils.getAbsoluteUrlByCwd(baseDir, this.config.cwd);
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
        return _fileList || (_fileList = utils.loadFiles(this.dir, options.pattern));
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
  private getGenerator(name: string): TsGenerator {
    const type = typeof name;
    const typeIsString = type === 'string';
    generators = generators || utils.loadModules(path.resolve(__dirname, './generators'));
    let generator = typeIsString ? generators[name] : name;

    if (!generator && typeIsString) {
      try {
        // try to load generator as module path
        const generatorPath = name.startsWith('.')
          ? path.join(this.config.cwd, name)
          : name;

        generator = require(generatorPath);
      } catch (e) {
        // do nothing
      }
    }

    // check esm default
    if (typeof generator.default === 'function') {
      generator.default.defaultConfig = generator.defaultConfig;
      generator = generator.default;
    }

    assert(typeof generator === 'function', `generator: ${name} not exist!!`);

    return generator;
  }
}
