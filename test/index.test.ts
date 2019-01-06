import d from 'debug';
import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import { sleep, spawn, getStd } from './utils';
import assert = require('assert');
import TsHelper, { createTsHelperInstance, getDefaultWatchDirs } from '../dist/';
const eggBin = path.resolve(__dirname, '../node_modules/.bin/egg-bin' + (os.platform() === 'win32' ? '.cmd' : ''));
const debug = d('egg-ts-helper#index.test');
const noop = () => {};
const timeout = (delay, callback: () => any) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      callback();
      reject('timeout');
    }, delay);
  });
};

describe('index.test.ts', () => {
  let tsHelper: TsHelper;
  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/*/typings'), { force: true });
  });

  afterEach(() => {
    if (tsHelper) tsHelper.destroy();
  });

  it('should works without error', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(!!tsHelper.config);
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/plugin.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/custom.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/custom2.d.ts')));

    // caseStyle check
    const caseStylePath = path.resolve(__dirname, './fixtures/app/typings/app/casestyle/index.d.ts');
    const caseStyleContent = fs.readFileSync(caseStylePath, 'utf8');
    assert(fs.existsSync(caseStylePath));
    assert(caseStyleContent.includes('simpleTest: ExportSimpleTestSchema'));

    // dts check
    const dts = path.resolve(__dirname, './fixtures/app/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');
    debug('service file list %o', fs.readdirSync(dir));

    await sleep(2000);

    del.sync(dir, { force: true });
    const content = fs.readFileSync(dts, { encoding: 'utf-8' });
    assert(content.includes('service/test/test'));
    assert(content.includes('service/test/test-two'));
    assert(content.includes('test: ExportTestTest'));
    assert(content.includes('testTwo: ExportTestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should support oneForAll', async () => {
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: false,
      autoRemoveJs: false,
    });

    await tsHelper.build();
    await tsHelper.createOneForAll();

    const oneForAllDist = path.resolve(__dirname, './fixtures/app/typings/ets.d.ts');
    const oneForAll = fs.readFileSync(oneForAllDist, { encoding: 'utf-8' });
    assert(oneForAll.includes('import \'./app/controller/index\';'));
    assert(oneForAll.includes('import \'./app/extend/context\';'));
    assert(oneForAll.includes('import \'./app/middleware/index\';'));
    assert(oneForAll.includes('import \'./config/index\';'));
    assert(oneForAll.includes('import \'./custom\';'));
  });

  it('should works with custom oneForAll dist', async () => {
    const oneForAllDist = path.resolve(__dirname, './fixtures/app/typings/all/special.d.ts');
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: false,
      autoRemoveJs: false,
    });

    await tsHelper.build();
    await tsHelper.createOneForAll(oneForAllDist);

    // onForAll check
    const oneForAll = fs.readFileSync(oneForAllDist, { encoding: 'utf-8' });
    assert(oneForAll.includes('import \'../app/controller/index\';'));
    assert(oneForAll.includes('import \'../app/extend/context\';'));
    assert(oneForAll.includes('import \'../app/middleware/index\';'));
    assert(oneForAll.includes('import \'../config/index\';'));
    assert(oneForAll.includes('import \'../custom\';'));
  });

  it('should works with polling watcher', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      watchOptions: {
        usePolling: true,
      },
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(!!tsHelper.config);
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));

    const dts = path.resolve(__dirname, './fixtures/app/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');
    debug('service file list %o', fs.readdirSync(dir));

    await sleep(2000);

    del.sync(dir, { force: true });
    const content = fs.readFileSync(dts, { encoding: 'utf-8' });
    assert(content.includes('service/test/test'));
    assert(content.includes('service/test/test-two'));
    assert(content.includes('test: ExportTestTest'));
    assert(content.includes('testTwo: ExportTestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should works without error while config file changed', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
      watchDirs: {
        config: { pattern: 'config.*.ts' },
      } as any,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));

    const defaultConfigPath = path.resolve(__dirname, './fixtures/app/config/config.default.ts');
    const baseConfig = fs.readFileSync(defaultConfigPath);
    const localConfigPath = path.resolve(__dirname, './fixtures/app/config/config.local.ts');
    const localConfig = fs.readFileSync(localConfigPath);
    const end = () => {
      fs.writeFileSync(defaultConfigPath, baseConfig);
      fs.writeFileSync(localConfigPath, localConfig);
    };

    fs.writeFile(defaultConfigPath, baseConfig + '\n\n', () => {
      fs.writeFile(defaultConfigPath, baseConfig + '\n', noop);
      fs.writeFile(localConfigPath, baseConfig, noop);
    });

    await Promise.race([
      new Promise(resolve => {
        function cb(_, p) {
          if (p === defaultConfigPath) {
            end();
            throw new Error('should not update config.default.ts');
          } else if (p === localConfigPath) {
            end();
            tsHelper.removeListener('update', cb);
            resolve();
          }
        }

        tsHelper.on('update', cb);
      }),
      timeout(10000, end),
    ]);

    await sleep(100);
  });

  it('should works without error while plugin file changed', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/plugin.d.ts')));

    const defaultPluginPath = path.resolve(__dirname, './fixtures/app/config/plugin.default.ts');
    const basePlugin = fs.readFileSync(defaultPluginPath);
    const pluginPath = path.resolve(__dirname, './fixtures/app/config/plugin.ts');
    const pluginText = fs.readFileSync(pluginPath);
    const end = () => {
      fs.writeFileSync(defaultPluginPath, basePlugin);
    };

    fs.writeFile(defaultPluginPath, pluginText, noop);

    await Promise.race([
      new Promise(resolve => {
        function cb(_, p) {
          if (p === defaultPluginPath) {
            end();
            tsHelper.removeListener('update', cb);
            resolve();
          }
        }

        tsHelper.on('update', cb);
      }),
      timeout(10000, end),
    ]);
  });

  it('should support rewrite by options.watchDirs', () => {
    const watchDirs = getDefaultWatchDirs();
    Object.keys(watchDirs).forEach(key => {
      if (key === 'proxy') {
        watchDirs[key] = {
          ...(watchDirs[key] as any),
          path: 'app/test/proxy',
          interface: 'IProxy',
          generator: 'class',
          enabled: true,
        };
      } else {
        watchDirs[key] = false;
      }
    });

    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watchDirs,
    });

    assert(tsHelper.watcherList.length === 1);
    assert(!!tsHelper.watcherList.find(watcher => watcher.name === 'proxy'));
  });

  it('should support read framework by package.json', () => {
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'egg');
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app2'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'larva');
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app4'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'chair');
  });

  it('should support rewrite by package.json', () => {
    const watchDirs = getDefaultWatchDirs();
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app4'),
    });
    const len = Object.keys(watchDirs).filter(k => {
      const item = (watchDirs[k] as any);
      return !item.hasOwnProperty('enabled') || item.enabled;
    }).length;
    assert(tsHelper.watcherList.length === len - 2);
    assert(!!tsHelper.watcherList.find(watcher => watcher.name === 'controller'));
  });

  it('should works without error in real app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/real/');
    tsHelper = createTsHelperInstance({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    const proc = spawn(eggBin, [ 'dev', '--ts', '--baseDir', baseDir, '--port', '7661' ], {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...{
          NODE_ENV: 'development',
          TS_NODE_PROJECT: path.resolve(baseDir, './tsconfig.json'),
        },
      },
    });

    const { stdout, stderr } = await getStd(proc, true);
    assert(stdout.includes('egg started on http'));
    assert(!stderr);
  });

  it('should works without error in unittest', async () => {
    const baseDir = path.join(__dirname, './fixtures/real-unittest/');
    del.sync(path.resolve(baseDir, './typings'));
    del.sync(path.resolve(baseDir, './node_modules'));
    fs.symlinkSync(path.resolve(__dirname, '../node_modules'), path.resolve(baseDir, './node_modules'), 'dir');
    const proc = spawn(eggBin, [ 'test', '--ts', '-r', path.resolve(__dirname, '../register') ], {
      cwd: baseDir,
    });
    const { stdout, stderr } = await getStd(proc, true);
    assert(stdout.includes('passing'));
    assert(!stderr);
  });

  it('should works without error in coverage', async () => {
    const baseDir = path.join(__dirname, './fixtures/real-unittest/');
    del.sync(path.resolve(baseDir, './typings'));
    del.sync(path.resolve(baseDir, './node_modules'));
    fs.symlinkSync(path.resolve(__dirname, '../node_modules'), path.resolve(baseDir, './node_modules'), 'dir');
    const proc = spawn(eggBin, [ 'cov', '--ts', '-r', path.resolve(__dirname, '../register') ], {
      cwd: baseDir,
    });
    const { stdout, stderr } = await getStd(proc, true);
    assert(stdout.includes('passing'));
    assert(!stderr);
  });

  it('should works in real-js app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/real-js/');
    tsHelper = createTsHelperInstance({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(baseDir, './typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/service/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/config/index.d.ts')));
  });
});
