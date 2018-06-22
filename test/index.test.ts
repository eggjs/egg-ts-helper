import * as d from 'debug';
import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
import { default as TsHelper, getDefaultWatchDirs } from '../dist/';
const debug = d('egg-ts-helper#index.test');

function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

describe('index.test.ts', () => {
  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/*/typings'), { force: true });
  });

  it('should works without error', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(!!tsHelper.config);
    assert(tsHelper.config.framework === 'larva');
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/model/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/plugin.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/custom.d.ts')));

    const dts = path.resolve(__dirname, './fixtures/app/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');
    debug('service file list %o', fs.readdirSync(dir));

    await sleep(2000);

    del.sync(dir, { force: true });
    const content = fs.readFileSync(dts, { encoding: 'utf-8' });
    assert(content.includes('service/test/test'));
    assert(content.includes('service/test/test-two'));
    assert(content.includes('test: TestTest'));
    assert(content.includes('testTwo: TestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should works with polling watcher', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    const tsHelper = new TsHelper({
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
    assert(tsHelper.config.framework === 'larva');
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
    assert(content.includes('test: TestTest'));
    assert(content.includes('testTwo: TestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should works without error while config file changed', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));

    const defaultConfigPath = path.resolve(__dirname, './fixtures/app/config/config.default.ts');
    const baseConfig = fs.readFileSync(defaultConfigPath);
    const localConfigPath = path.resolve(__dirname, './fixtures/app/config/config.local.ts');
    const localConfig = fs.readFileSync(localConfigPath);

    fs.writeFile(defaultConfigPath, baseConfig + '\n\n', () => {
      fs.writeFile(defaultConfigPath, baseConfig + '\n', () => { /* do nothing */ });
      fs.writeFile(localConfigPath, baseConfig, () => { /* do nothing */ });
    });

    await new Promise(resolve => {
      function cb(_, p) {
        if (p === defaultConfigPath) {
          throw new Error('should not update config.default.ts');
        } else if (p === localConfigPath) {
          tsHelper.removeListener('update', cb);
          resolve();
        }
      }

      tsHelper.on('update', cb);
    });

    fs.writeFileSync(defaultConfigPath, baseConfig);
    fs.writeFileSync(localConfigPath, localConfig);

    await sleep(100);
  });

  it('should works without error while plugin file changed', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    const tsHelper = new TsHelper({
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

    fs.writeFile(defaultPluginPath, pluginText, () => { /* do nothing */ });
    await new Promise(resolve => {
      function cb(_, p) {
        if (p === defaultPluginPath) {
          tsHelper.removeListener('update', cb);
          resolve();
        }
      }

      tsHelper.on('update', cb);
    });

    fs.writeFileSync(defaultPluginPath, basePlugin);
  });

  it('should support read framework by package.json', () => {
    let tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watch: false,
    });

    assert(tsHelper.config.framework === 'egg');

    tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app2'),
      watch: false,
    });

    assert(tsHelper.config.framework === 'larva');

    tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app4'),
      watch: false,
    });

    assert(tsHelper.config.framework === 'chair');
  });

  it('should support rewrite by options.watchDirs', () => {
    const watchDirs = getDefaultWatchDirs();
    Object.keys(watchDirs).forEach(key => {
      if (key === 'proxy') {
        watchDirs[key] = {
          ...watchDirs[key],
          path: 'app/test/proxy',
          interface: 'IProxy',
          generator: 'class',
          enabled: true,
        };
      } else {
        watchDirs[key] = false;
      }
    });

    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watchDirs,
    });

    debug('watchDirs : %o', tsHelper.watchDirs);
    assert(tsHelper.watchNameList.length === 1);
    assert(tsHelper.watchDirs[0].includes('proxy'));
  });

  it('should support rewrite by package.json', () => {
    const watchDirs = getDefaultWatchDirs();
    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app4'),
    });
    const len = Object.keys(watchDirs).filter(k => watchDirs[k].enabled).length;
    assert(tsHelper.watchNameList.length === len - 2);
    assert(tsHelper.watchDirs[0].includes('controller'));
  });
});
