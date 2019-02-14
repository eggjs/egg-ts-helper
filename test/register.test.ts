import del from 'del';
import fs from 'fs';
import { getStd, fork, spawn } from './utils';
import path from 'path';
import assert = require('assert');
import extend from 'extend2';

const options = {
  silent: true,
  env: {
    ...process.env,
    ETS_SILENT: 'false',
    ETS_WATCH: 'true',
  },
  cwd: path.resolve(__dirname, './fixtures/app8'),
};

const runRegister = (opt?: Partial<typeof options>) => {
  return fork(path.resolve(__dirname, '../register.js'), [], extend(true, {}, options, opt));
};

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
    await getStd(runRegister(), true);
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

  it('should auto gen jsconfig in js proj', async () => {
    const appPath = path.resolve(__dirname, './fixtures/app10');
    const jsConfigPath = path.resolve(appPath, './jsconfig.json');
    del.sync(jsConfigPath);
    const { stderr } = await getStd(runRegister({ cwd: appPath }));
    assert(!stderr);
    assert(fs.existsSync(jsConfigPath));
  });

  it('should not cover exists jsconfig.json in js proj', async () => {
    const appPath = path.resolve(__dirname, './fixtures/app11');
    const jsConfigPath = path.resolve(appPath, './jsconfig.json');
    const { stderr } = await getStd(runRegister({ cwd: appPath }));
    assert(!stderr);
    assert(fs.existsSync(jsConfigPath));
    assert(!!JSON.parse(fs.readFileSync(jsConfigPath).toString()).mySpecConfig);
  });
});
