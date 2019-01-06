import del from 'del';
import fs from 'fs';
import { getStd, fork, spawn, sleep } from './utils';
import path from 'path';
import assert = require('assert');
const options = {
  silent: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
  },
  cwd: path.resolve(__dirname, './fixtures/app8'),
};
const runRegister = () => fork(path.resolve(__dirname, '../register.js'), [], options);

describe('register.test.ts', () => {
  beforeEach(() => {
    del.sync(path.resolve(__dirname, '../.cache'));
    del.sync(path.resolve(__dirname, './fixtures/app8/typings'), { force: true });
  });

  it('should cache pid', async () => {
    const ps = runRegister();
    const { stdout, stderr } = await getStd(ps);

    assert(!stderr);
    assert(stdout.includes('create'));
    assert(fs.existsSync(path.resolve(__dirname, '../.cache')));
    const pid = fs.readFileSync(path.resolve(__dirname, '../.cache')).toString();

    const ps2 = runRegister();
    const { stdout: stdout2 } = await getStd(ps2);
    assert(!stdout2.includes('create'));
    assert(pid === fs.readFileSync(path.resolve(__dirname, '../.cache')).toString());
  });

  it('should works while cache pid is not exist', async () => {
    const pid = '23567';
    fs.writeFileSync(path.resolve(__dirname, '../.cache'), pid);
    getStd(runRegister(), true);
    await sleep(2000);
    assert(pid !== fs.readFileSync(path.resolve(__dirname, '../.cache')).toString());
  });

  it('should works with --require without error', async () => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      options,
    );

    const { stdout, stderr } = await getStd(ps);
    assert(!stderr);
    assert(stdout.includes('create'));
    assert(stdout.includes('done'));
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
        ...options,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      },
    );

    const { stdout, stderr } = await getStd(ps);
    assert(!stderr);
    assert(!stdout.includes('create'));
    assert(stdout.includes('done'));
  });
});
