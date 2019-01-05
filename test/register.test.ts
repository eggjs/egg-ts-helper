import { spawn } from 'child_process';
import del from 'del';
import path from 'path';
import assert = require('assert');

describe('register.test.ts', () => {
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
        tick = setTimeout(resolve, 2000);
      });
    });

    assert(str.includes('create'));
    assert(str.includes('done'));
    ps.kill('SIGINT');
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

    assert(!str.includes('create'));
    assert(str.includes('done'));
    ps.kill('SIGINT');
  });
});
