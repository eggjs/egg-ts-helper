import { spawn } from 'child_process';
import * as d from 'debug';
import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as assert from 'power-assert';
import { createTsHelperInstance, getDefaultWatchDirs } from '../src/';
const debug = d('egg-ts-helper#index.test');
const noop = () => {};
const timeout = (delay, callback: () => any) => {
  return  new Promise((_, reject) => {
    setTimeout(() => {
      callback();
      reject('timeout');
    }, delay);
  });
};

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

    const tsHelper = createTsHelperInstance({
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

    // casestyle check
    const caseStylePath = path.resolve(__dirname, './fixtures/app/typings/app/casestyle/index.d.ts');
    const caseStyleContent = fs.readFileSync(caseStylePath, 'utf8');
    assert(fs.existsSync(caseStylePath));
    assert(caseStyleContent.search('simpleTest: SimpleTestSchema') !== -1);

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

    const tsHelper = createTsHelperInstance({
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
    assert(content.includes('test: TestTest'));
    assert(content.includes('testTwo: TestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should works without error while config file changed', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    mkdirp.sync(dir);

    const tsHelper = createTsHelperInstance({
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

    const tsHelper = createTsHelperInstance({
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

    const tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watchDirs,
    });

    debug('watchDirs : %o', tsHelper.watchDirs);
    assert(tsHelper.watchNameList.length === 1);
    assert(tsHelper.watchDirs[0].includes('proxy'));
  });

  it('should support read framework by package.json', () => {
    let tsHelper = createTsHelperInstance({
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
    const tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app4'),
    });
    const len = Object.keys(watchDirs).filter(k => (watchDirs[k] as any).enabled).length;
    assert(tsHelper.watchNameList.length === len - 2);
    assert(tsHelper.watchDirs[0].includes('controller'));
  });

  it('should works without error in real app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/real/');
    createTsHelperInstance({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(4000);

    const eggBin = path.resolve(__dirname, '../node_modules/.bin/egg-bin' + (os.platform() === 'win32' ? '.cmd' : ''));
    const proc = spawn(eggBin, ['dev', '--ts', '--baseDir', baseDir], {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...{
          TS_NODE_PROJECT: path.resolve(baseDir, './tsconfig.json'),
        },
      },
    });

    await new Promise((resolve, reject) => {
      proc.stdout.on('data', info => {
        if (info.toString().match(/egg started on http/)) {
          proc.kill('SIGINT');
          resolve();
        }
      });

      let errorInfo = '';
      let tick;
      proc.stderr.on('data', info => {
        errorInfo += info.toString();
        clearTimeout(tick);
        tick = setTimeout(() => {
          reject(new Error(errorInfo));
          proc.kill('SIGINT');
        }, 3000);
      });
    });
  });
});
