import del from 'del';
import fs from 'fs';
import path from 'path';
import { triggerBin, getOutput } from '../utils';
import assert = require('assert');

describe('cmd/init.test.ts', () => {
  const appPath = path.resolve(__dirname, '../fixtures/init');
  const runInit = type => {
    const cp = triggerBin('init', '-c', appPath);
    cp.stdin.write(type + '\n');
    // cp.stdout.pipe(process.stdout);
    return new Promise(resolve => cp.on('exit', resolve));
  };

  afterEach(() => {
    del.sync(path.resolve(appPath, './*.json'));
  });

  it('ts & prompt', async () => {
    await runInit('typescript');
    assert(fs.existsSync(path.resolve(appPath, 'package.json')));
    assert(fs.existsSync(path.resolve(appPath, 'tsconfig.json')));
    const pkg = JSON.parse(fs.readFileSync(path.resolve(appPath, 'package.json')).toString());
    assert(pkg.egg.typescript);
    assert(pkg.egg.require.includes('egg-ts-helper/register'));
  });

  it('js & prompt', async () => {
    await runInit('javascript');
    assert(fs.existsSync(path.resolve(appPath, 'package.json')));
    assert(fs.existsSync(path.resolve(appPath, 'jsconfig.json')));
    const pkg = JSON.parse(fs.readFileSync(path.resolve(appPath, 'package.json')).toString());
    assert(!pkg.egg.typescript);
    assert(pkg.egg.require.includes('egg-ts-helper/register'));
  });

  it('tsconfig exist & without prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'tsconfig.json'), alreadyJsonStr);
    await getOutput('init', 'typescript', '-c', appPath);
    assert(fs.readFileSync(path.resolve(appPath, 'tsconfig.json')).toString() === alreadyJsonStr);
  });

  it('jsconfig exist & prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'jsconfig.json'), alreadyJsonStr);
    await runInit('javascript');
    assert(fs.readFileSync(path.resolve(appPath, 'jsconfig.json')).toString() === alreadyJsonStr);
  });

  it('jsconfig exist & without prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'jsconfig.json'), alreadyJsonStr);
    await getOutput('init', 'javascript', '-c', appPath);
    assert(fs.readFileSync(path.resolve(appPath, 'jsconfig.json')).toString() === alreadyJsonStr);
  });
});
