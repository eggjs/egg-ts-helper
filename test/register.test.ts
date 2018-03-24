import { spawn } from 'child_process';
import * as del from 'del';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'power-assert';

describe('register.test.ts', () => {
  beforeEach(() => {
    del.sync(path.resolve(__dirname, './fixtures/app8/typings'), {
      force: true,
    });
  });

  it('should works with --require without error', done => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      {
        cwd: path.resolve(__dirname, './fixtures/app8'),
      },
    );

    ps.stdout.on('data', data => {
      assert(data.toString() === 'done');
      process.kill(ps.pid, 'SIGINT');
      done();
    });
  });
});
