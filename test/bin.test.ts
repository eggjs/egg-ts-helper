import { ChildProcess, spawn } from 'child_process';
import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import assert = require('assert');

function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

describe('bin.test.ts', () => {
  let ps: ChildProcess | undefined;
  function triggerBin(...args: string[]) {
    ps = spawn('node', [ path.resolve(__dirname, '../dist/bin.js') ].concat(args));
    return ps;
  }

  function getOutput(...args: string[]) {
    ps = triggerBin.apply(null, args);
    return new Promise<string>(resolve => {
      let info = '';
      ps!.stdout.on('data', data => {
        info += data.toString();
      });

      ps!.on('close', () => {
        resolve(info);
      });
    });
  }

  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/*/typings'), { force: true });
  });

  afterEach(() => {
    if (ps && !ps.killed) {
      ps.kill();
    }
  });

  it('should works with -h correctly', async () => {
    const data = await getOutput('-h');
    assert(data.includes('Usage:'));
    assert(data.includes('Options:'));
  });

  it('should works with -v correctly', async () => {
    const data = await getOutput('-v');
    assert(data.match(/\d+\.\d+\.\d+/));
  });

  it('should works with -s correctly', async () => {
    const data = await getOutput('-c', path.resolve(__dirname, './fixtures/app4'));
    assert(data.includes('created'));
    const data2 = await getOutput('-s', '-c', path.resolve(__dirname, './fixtures/app4'));
    assert(!data2.includes('created'));
  });

  it('should works with empty flags correctly', async () => {
    const data = await getOutput();
    assert(!data);
  });

  it('should works with -e correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app6'), '-e', 'proxy');
    await sleep(2000);
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app6/typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app6/typings/app/proxy/index.d.ts')));
    del.sync(path.resolve(__dirname, './fixtures/app6/typings'), {
      force: true,
    });
  });

  it('should works with -i correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app5'), '-i', 'controller,service');
    await sleep(2000);
    assert(!fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/controller/index.d.ts')));
    assert(!fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/service/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/application.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/helper.d.ts')));
  });

  it('should works with clean command correctly', async () => {
    const tscBin = path.resolve(__dirname, '../node_modules/.bin/tsc' + (os.platform() === 'win32' ? '.cmd' : ''));
    const appPath = path.resolve(__dirname, './fixtures/app9');
    const p = spawn(tscBin, [], { cwd: appPath });
    await sleep(8000);
    p.kill('SIGINT');
    assert(fs.existsSync(path.resolve(appPath, './test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/test.js')));
    await new Promise(resolve => triggerBin('clean', '-c', appPath).on('exit', resolve));
    assert(fs.existsSync(path.resolve(appPath, './test2.js')));
    assert(!fs.existsSync(path.resolve(appPath, './test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/test.js')));
  });

  it('should created d.ts correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app8'));
    await sleep(3000);
    const content = fs
      .readFileSync(path.resolve(__dirname, './fixtures/app8/typings/app/controller/index.d.ts'))
      .toString();
    assert(content.includes('declare module \'egg\''));
    assert(content.includes('interface IController'));
    assert(content.includes('home: ExportHome'));
  });

  it('should works with -w and -e correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app4'), '-w', '-e', 'service');

    await sleep(2000);
    const dir = path.resolve(__dirname, './fixtures/app4/app/service/test');
    mkdirp.sync(dir);

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app4/typings/app/controller/index.d.ts')));
    const dts = path.resolve(__dirname, './fixtures/app4/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');

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
});
