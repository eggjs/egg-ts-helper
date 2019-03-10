/**
 * Getting plugin info in child_process to prevent effecting egg application( splitting scopes ).
 */

import 'cache-require-paths';
import fs from 'fs';
import path from 'path';
import { eggInfoPath } from '../config';
import { requireFile, getPkgInfo, writeFileSync, EggInfoResult, checkMaybeIsTsProj } from '../utils';
const cwd = findArgs('cwd');
const eggInfo: EggInfoResult = {};
const startTime = Date.now();
if (checkMaybeIsTsProj(cwd)) {
  // only require ts-node in ts project
  require('ts-node/register');
}

if (fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()) {
  const framework = (getPkgInfo(cwd).egg || {}).framework || 'egg';
  const loader = getLoader(cwd, framework);
  if (loader) {
    try {
      loader.loadPlugin();
    } catch (e) {
      // do nothing
    }

    // hack loadFile, ignore config file without customLoader for faster booting
    mockFn(loader, 'loadFile', filepath => {
      if (filepath && filepath.substring(filepath.lastIndexOf(path.sep) + 1).startsWith('config.')) {
        const fileContent = fs.readFileSync(filepath, { encoding: 'utf-8' });
        if (!fileContent.includes('customLoader')) return;
      }
      return true;
    });

    try {
      loader.loadConfig();
    } catch (e) {
      // do nothing
    }

    eggInfo.plugins = loader.allPlugins;
    eggInfo.config = loader.config;
    eggInfo.timing = Date.now() - startTime;
  }
}

writeFileSync(eggInfoPath, JSON.stringify(eggInfo));

/* istanbul ignore next */
function noop() {}

function findArgs(name: string) {
  const key = `--${name}`;
  return process.argv.find(a => a.startsWith(key))!.substring(key.length + 1);
}

function mockFn(obj, name, fn) {
  const oldFn = obj[name];
  obj[name] = (...args) => {
    const result = fn.apply(obj, args);
    if (result) return oldFn.apply(obj, args);
  };
}

function getLoader(baseDir: string, framework: string) {
  const frameworkPath = path.join(baseDir, 'node_modules', framework);
  const eggCore = findEggCore(baseDir, frameworkPath);
  /* istanbul ignore if */
  if (!eggCore) return;
  const EggLoader = eggCore.EggLoader;
  const egg = requireFile(frameworkPath) || requireFile(framework);
  /* istanbul ignore if */
  if (!egg || !EggLoader) return;
  process.env.EGG_SERVER_ENV = 'local';
  return new EggLoader({
    baseDir,
    logger: {
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    },
    app: Object.create(egg.Application.prototype),
  });
}

function findEggCore(baseDir: string, frameworkPath: string) {
  let eggCorePath = path.join(baseDir, 'node_modules/egg-core');
  if (!fs.existsSync(eggCorePath)) {
    eggCorePath = path.join(frameworkPath, 'node_modules/egg-core');
  }
  // try to load egg-core in cwd
  const eggCore = requireFile(eggCorePath);
  if (!eggCore) {
    // try to resolve egg-core
    return requireFile('egg-core');
  }
  return eggCore;
}
