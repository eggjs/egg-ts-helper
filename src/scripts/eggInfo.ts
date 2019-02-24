/**
 * Getting plugin info in child_process to prevent effecting egg application( splitting scopes ).
 */

import fs from 'fs';
import path from 'path';
import { requireFile, getPkgInfo, resolveModule } from '../utils';
const url = process.argv[2];
const stat = fs.statSync(url);
const eggInfo: { plugins?: PlainObject; config?: PlainObject; } = {};

if (stat.isDirectory()) {
  const framework = (getPkgInfo(url).egg || {}).framework || 'egg';
  const loader = getLoader(url, framework);
  if (loader) {
    try {
      loader.loadPlugin();
      // loader.loadConfig();
    } catch (e) {
      // do nothing
    }

    eggInfo.plugins = loader.allPlugins;
    eggInfo.config = loader.config;
  }
}

process.stdout.write(JSON.stringify(eggInfo));

function noop() {}

function getLoader(baseDir: string, framework: string) {
  const frameworkPath = path.join(baseDir, 'node_modules', framework);
  const eggCore = findEggCore(baseDir, frameworkPath);
  if (!eggCore) return;
  const EggLoader = eggCore.EggLoader;
  const egg = requireFile(frameworkPath);
  if (!egg) return;
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
    return resolveModule('egg-core');
  }
  return eggCore;
}
