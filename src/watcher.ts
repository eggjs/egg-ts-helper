import path from 'path';
import chokidar from 'chokidar';
import assert from 'assert';
import { EventEmitter } from 'events';
import { TsGenerator, TsGenConfig, TsHelperConfig, default as TsHelper } from './';
import * as utils from './utils';
import d from 'debug';
const debug = d('egg-ts-helper#watcher');
const generators = utils.loadModules(
  path.resolve(__dirname, './generators'),
  false,
  formatGenerator,
);

export interface BaseWatchItem {
  ref: string;
  directory: string;
  generator: string;
  enabled?: boolean;
  ignore?: string | string[];
  trigger?: Array<'add' | 'unlink' | 'change'>;
  pattern?: string | string[];
  watch?: boolean;
  execAtInit?: boolean;
}

export interface WatchItem extends PlainObject, BaseWatchItem { }

interface WatcherOptions extends WatchItem {
  name: string;
}

function formatGenerator(generator) {
  // check esm default
  if (generator && typeof generator.default === 'function') {
    generator.default.defaultConfig = generator.defaultConfig;
    generator.default.isPrivate = generator.isPrivate;
    generator = generator.default;
  }
  return generator;
}

export default class Watcher extends EventEmitter {
  ref: string;
  name: string;
  dir: string;
  options: WatcherOptions;
  pattern: string[];
  dtsDir: string;
  config: TsHelperConfig;
  generator: TsGenerator;
  fsWatcher?: chokidar.FSWatcher;
  throttleTick: any = null;
  throttleStack: string[] = [];

  constructor(public helper: TsHelper) {
    super();
    this.helper = helper;
  }

  public init(options: WatcherOptions) {
    const generatorName = options.generator || 'class';
    this.config = this.helper.config;
    this.name = options.name;
    this.ref = options.ref;
    this.generator = this.getGenerator(generatorName);
    options = this.options = {
      trigger: [ 'add', 'unlink' ],
      generator: generatorName,
      pattern: '**/*.(ts|js)',
      watch: true,
      ...this.generator.defaultConfig,
      ...options,
    };

    this.pattern = utils.toArray(this.options.pattern)
      .map(utils.formatPath)
      .concat(utils.toArray(this.options.ignore).map(p => `!${utils.formatPath(p)}`));

    assert(options.directory, `options.directory must set in ${generatorName}`);
    const baseDir = options.directory.replace(/\/|\\/, path.sep);
    this.dir = utils.getAbsoluteUrlByCwd(baseDir, this.config.cwd);
    this.dtsDir = path.resolve(
      this.config.typings,
      path.relative(this.config.cwd, this.dir),
    );

    // watch file change
    if (this.options.watch) {
      this.watch();
    }

    // exec at init
    if (this.options.execAtInit) {
      this.execute();
    }
  }

  static isPrivateGenerator(name: string) {
    return !!(generators[name] && generators[name].isPrivate);
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

    const watcher = chokidar.watch(this.pattern, {
      cwd: this.dir,
      ignoreInitial: true,
      ...(this.config.watchOptions || {}),
    });

    // listen watcher event
    this.options.trigger!.forEach(evt => {
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
    let _fileList: string[] | undefined;

    // use utils.extend to extend getter
    const newConfig = utils.extend<TsGenConfig>({}, this.options, {
      file,
      dir: this.dir,
      dtsDir: this.dtsDir,
      get fileList() {
        return _fileList || (_fileList = utils.loadFiles(this.dir, this.pattern));
      },
    });

    const startTime = Date.now();
    const result = this.generator(newConfig, this.config, this.helper);
    if (result) {
      this.emit('update', result, file, startTime);
    }

    return result;
  }

  // on file change
  private onChange(filePath: string) {
    filePath = utils.getAbsoluteUrlByCwd(filePath, this.dir);
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
    let generator = typeIsString ? generators[name] : name;

    if (!generator && typeIsString) {
      // try to load generator as module path
      const generatorPath = utils.resolveModule(name.startsWith('.')
        ? path.join(this.config.cwd, name)
        : name,
      );

      if (generatorPath) {
        generator = require(generatorPath);
      }
    }

    generator = formatGenerator(generator);
    assert(typeof generator === 'function', `generator: ${name} not exist!!`);

    return generator;
  }
}
