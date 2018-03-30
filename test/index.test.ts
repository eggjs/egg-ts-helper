import * as d from 'debug';
import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
import TsHelper from '../dist/';
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

    await sleep(1000);

    assert(!!tsHelper.config);
    assert(tsHelper.config.framework === 'larva');
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/extend/context.d.ts')));
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
    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watchDirs: {
        extend: false,
        controller: false,
        service: false,
        proxy: {
          path: 'app/test/proxy',
          interface: 'IProxy',
          generator: 'class',
          enabled: true,
        },
      },
    });

    debug('watchDirs : %o', tsHelper.watchDirs);
    assert(tsHelper.watchNameList.length === 1);
    assert(tsHelper.watchDirs[0].includes('proxy'));
  });

  it('should support rewrite by package.json', () => {
    const tsHelper = new TsHelper({
      cwd: path.resolve(__dirname, './fixtures/app4'),
    });

    assert(tsHelper.watchNameList.length === 1);
    assert(tsHelper.watchDirs[0].includes('controller'));
  });
});
