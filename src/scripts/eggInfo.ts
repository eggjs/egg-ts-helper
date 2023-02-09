/**
 * Getting plugin info in child_process to prevent effecting egg application( splitting scopes ).
 */

import fs from 'fs';
import path from 'path';
import { eggInfoPath } from '../config';
import * as utils from '../utils';

const cwd = process.cwd();
const eggInfo: utils.EggInfoResult = {};
const startTime = Date.now();

if (utils.checkMaybeIsTsProj(cwd)) {
  // only require ts-node in ts project
  const tsconfigPath = path.resolve(cwd, './tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    require('ts-node').register(utils.readJson5(tsconfigPath));
  } else {
    require('ts-node/register');
  }
}

// try to read postinstall script env.ETS_SCRIPT_FRAMEWORK, let egg-bin can auto set the default framework
const framework = (utils.getPkgInfo(cwd).egg || {}).framework || process.env.ETS_SCRIPT_FRAMEWORK || 'egg';
const loader = getLoader(cwd, framework);
if (loader) {
  try {
    loader.loadPlugin();
  } catch (e) {
    console.warn('[egg-ts-helper] WARN loader.loadPlugin() error: %s, cwd: %s, framework: %s',
      e, cwd, framework);
    // do nothing
  }

  // hack loadFile, ignore config file without customLoader for faster booting
  mockFn(loader, 'loadFile', filepath => {
    if (filepath && filepath.substring(filepath.lastIndexOf(path.sep) + 1).startsWith('config.')) {
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      if (!fileContent.includes('customLoader')) return;
    }
    return true;
  });

  try {
    loader.loadConfig();
  } catch (e) {
    console.warn('[egg-ts-helper] WARN loader.loadConfig() error: %s, cwd: %s, framework: %s',
      e, cwd, framework);
    // do nothing
  }

  eggInfo.plugins = loader.allPlugins;
  eggInfo.config = loader.config;
  eggInfo.eggPaths = loader.eggPaths;
  eggInfo.timing = Date.now() - startTime;
}

utils.writeFileSync(eggInfoPath, JSON.stringify(eggInfo));

/* istanbul ignore next */
function noop() {}

function mockFn(obj, name, fn) {
  const oldFn = obj[name];
  obj[name] = (...args) => {
    const result = fn.apply(obj, args);
    if (result) return oldFn.apply(obj, args);
  };
}

function getLoader(baseDir: string, framework: string) {
  let frameworkPath = '';
  try {
    frameworkPath = require.resolve(framework, { paths: [ baseDir ] });
  } catch (_) {
    // ignore error
  }
  if (!frameworkPath) {
    frameworkPath = path.join(baseDir, 'node_modules', framework);
  }
  const eggCore = findEggCore(baseDir, frameworkPath);
  if (!eggCore) {
    console.warn('[egg-ts-helper] WARN cannot find egg core from frameworkPath: %s', frameworkPath);
    return;
  }
  const EggLoader = eggCore.EggLoader;
  const egg = utils.requireFile(frameworkPath) || utils.requireFile(framework);
  if (!egg || !egg.Application || !EggLoader) return;
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
  let eggCorePath = '';
  try {
    eggCorePath = require.resolve('egg-core', { paths: [ frameworkPath ] });
  } catch (_) {
    // ignore error
  }
  if (!eggCorePath) {
    eggCorePath = path.join(baseDir, 'node_modules/egg-core');
    if (!fs.existsSync(eggCorePath)) {
      eggCorePath = path.join(frameworkPath, 'node_modules/egg-core');
    }
  }
  // try to load egg-core in cwd
  const eggCore = utils.requireFile(eggCorePath);
  if (!eggCore) {
    // try to resolve egg-core
    return utils.requireFile('egg-core');
  }
  return eggCore;
}
