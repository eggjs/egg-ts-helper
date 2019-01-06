import fs from 'fs';
import path from 'path';
import { triggerBin, tsc } from '../utils';
import assert = require('assert');

describe('cmd/clean.test.ts', () => {
  it('should works with clean command correctly', async () => {
    const appPath = path.resolve(__dirname, '../fixtures/app9');
    await tsc(appPath);
    assert(fs.existsSync(path.resolve(appPath, './test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/test.js')));
    await new Promise(resolve => triggerBin('clean', '-c', appPath).on('exit', resolve));
    assert(fs.existsSync(path.resolve(appPath, './test2.js')));
    assert(!fs.existsSync(path.resolve(appPath, './test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/test.js')));
  });
});
