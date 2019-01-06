import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import assert = require('assert');
import { triggerBin, getOutput, sleep } from './utils';

describe('bin.test.ts', () => {
  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/*/typings'), { force: true });
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
    assert(data.includes('create'));
    const data2 = await getOutput('-s', '-c', path.resolve(__dirname, './fixtures/app4'));
    assert(!data2.includes('create'));
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

  it('should created d.ts correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app8'), '-E', '{}');
    await sleep(3000);
    const content = fs
      .readFileSync(path.resolve(__dirname, './fixtures/app8/typings/app/controller/index.d.ts'))
      .toString();
    assert(content.includes('declare module \'egg\''));
    assert(content.includes('interface IController'));
    assert(content.includes('home: ExportHome'));
  });

  it('should support oneForAll in cli', async () => {
    // default dist
    triggerBin('-c', path.resolve(__dirname, './fixtures/app6'), '-o');
    await sleep(2000);
    let content = fs
      .readFileSync(path.resolve(__dirname, './fixtures/app6/typings/ets.d.ts'))
      .toString();
    assert(content.includes("import './app/controller/index';"));

    // custom dist
    triggerBin('-c', path.resolve(__dirname, './fixtures/app6'), '-o', path.resolve(__dirname, './fixtures/app6/typings/special.d.ts'));
    await sleep(2000);
    content = fs
      .readFileSync(path.resolve(__dirname, './fixtures/app6/typings/special.d.ts'))
      .toString();
    assert(content.includes("import './app/controller/index';"));
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
