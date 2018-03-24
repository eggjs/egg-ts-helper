import { ChildProcess, spawn } from 'child_process';
import * as del from 'del';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as assert from 'power-assert';
const isWin = process.platform === 'win32';

function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

describe('bin.test.ts', () => {
  let ps: ChildProcess | undefined;
  function triggerBin(...args: string[]) {
    ps = spawn(
      'node',
      [path.resolve(__dirname, '../dist/bin.js')].concat(args),
    );
    ps.stderr.on('data', data => {
      console.info(data.toString());
    });
    return ps;
  }

  function getOutput(...args: string[]) {
    ps = triggerBin.apply(null, args);
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
    const data = await getOutput(
      '-c',
      path.resolve(__dirname, './fixtures/app4'),
    );
    assert(data.includes('created'));
    const data2 = await getOutput(
      '-s',
      '-c',
      path.resolve(__dirname, './fixtures/app4'),
    );
    assert(!data2.includes('created'));
  });

  it('should works with -e correctly', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app6'), '-e', 'proxy');
    await sleep(2000);
    assert(
      fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app6/typings/app/controller/index.d.ts',
        ),
      ),
    );
    assert(
      fs.existsSync(
        path.resolve(__dirname, './fixtures/app6/typings/app/proxy/index.d.ts'),
      ),
    );
    del.sync(path.resolve(__dirname, './fixtures/app6/typings'), {
      force: true,
    });
  });

  it('should works with -i correctly', async () => {
    triggerBin(
      '-c',
      path.resolve(__dirname, './fixtures/app5'),
      '-i',
      'controller,service',
    );
    await sleep(2000);
    assert(
      !fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app5/typings/app/controller/index.d.ts',
        ),
      ),
    );
    assert(
      !fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app5/typings/app/service/index.d.ts',
        ),
      ),
    );
    assert(
      fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app5/typings/app/extend/context.d.ts',
        ),
      ),
    );
    assert(
      fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app5/typings/app/extend/application.d.ts',
        ),
      ),
    );
    assert(
      fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app5/typings/app/extend/helper.d.ts',
        ),
      ),
    );
  });

  it('should works without error', async () => {
    triggerBin('-c', path.resolve(__dirname, './fixtures/app8'));
    await sleep(1000);
    const content = fs.readFileSync(
      path.resolve(
        __dirname,
        './fixtures/app8/typings/app/controller/index.d.ts',
      ),
    ).toString();
    assert(content.includes('declare module \'egg\''));
    assert(content.includes('interface IController'));
    assert(content.includes('home: Home'));
  });

  it('should works with -w and -e correctly', async () => {
    triggerBin(
      '-c',
      path.resolve(__dirname, './fixtures/app4'),
      '-w',
      '-e',
      'service',
    );

    await sleep(2000);
    const dir = path.resolve(__dirname, './fixtures/app4/app/service/test');
    mkdirp.sync(dir);

    assert(
      fs.existsSync(
        path.resolve(
          __dirname,
          './fixtures/app4/typings/app/controller/index.d.ts',
        ),
      ),
    );
    const dts = path.resolve(
      __dirname,
      './fixtures/app4/typings/app/service/index.d.ts',
    );
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
