import { spawn } from 'child_process';
import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
const isWin = process.platform === 'win32';

function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

function triggerBin(...args: string[]) {
  return spawn(
    path.resolve(__dirname, '../node_modules/.bin/ts-node' + (isWin ? '.cmd' : '')),
    [path.resolve(__dirname, '../dist/bin.js')].concat(args),
  );
}

function getOutput(...args: string[]) {
  const ps = triggerBin(args);
  return new Promise(resolve => {
    let info = '';
    ps.stdout.on('data', data => {
      info += data.toString();
    });

    ps.on('close', () => {
      resolve(info);
    });
  });
}

describe('bin.ts', () => {
  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/app4/typings'), { force: true });
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

  it('should works with -i correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app5'), '-i', 'controller,service');
    await sleep(2000);
    assert(!fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/controller/index.d.ts')));
    assert(!fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/service/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/application.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app5/typings/app/extend/helper.d.ts')));
  });

  it('should works with -w correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app4'), '-w');

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
    assert(content.includes('test: TestTest'));
    assert(content.includes('testTwo: TestTestTwo'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });
});
