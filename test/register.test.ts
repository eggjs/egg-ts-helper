import { spawn } from 'child_process';
import * as del from 'del';
import * as path from 'path';
import * as assert from 'power-assert';

describe.only('register.test.ts', () => {
  beforeEach(() => {
    del.sync(path.resolve(__dirname, '../.cache'));
    del.sync(path.resolve(__dirname, './fixtures/app8/typings'), {
      force: true,
    });
  });

  it('should works with --require without error', async () => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'development',
        },
        cwd: path.resolve(__dirname, './fixtures/app8'),
      },
    );

    let str = '';
    await new Promise(resolve => {
      let tick;
      ps.stdout.on('data', data => {
        str += data.toString();
        clearTimeout(tick);
        tick = setTimeout(resolve, 1000);
      });
    });

    assert(str.includes('created'));
    assert(str.includes('done'));
    process.kill(ps.pid);
  });

  it('should silent when NODE_ENV is test', async () => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
        cwd: path.resolve(__dirname, './fixtures/app8'),
      },
    );

    let str = '';
    await new Promise(resolve => {
      let tick;
      ps.stdout.on('data', data => {
        str += data.toString();
        clearTimeout(tick);
        tick = setTimeout(resolve, 1000);
      });
    });

    assert(!str.includes('created'));
    assert(str.includes('done'));
    process.kill(ps.pid);
  });
});
