/**
 * Getting plugin info in child_process to prevent effecting egg application( splitting scopes ).
 */

import 'ts-node/register';
import fs from 'fs';
import path from 'path';
import { requireFile, getPkgInfo } from '../utils';
const url = findArgs('url');
const eggInfo: { plugins?: PlainObject; config?: PlainObject; } = {};

if (url && fs.existsSync(url) && fs.statSync(url).isDirectory()) {
  const framework = (getPkgInfo(url).egg || {}).framework || 'egg';
  const loader = getLoader(url, framework);
  if (loader) {
    try {
      loader.loadPlugin();
    } catch (e) {
      // do nothing
    }

    try {
      loader.loadConfig();
    } catch (e) {
      // do nothing
    }

    const config = loader.config || {};
    loader.loadToApp = hookLoader(config, 'app');
    loader.loadToContext = hookLoader(config, 'ctx');
    loader.loadCustomApp();

    eggInfo.plugins = loader.allPlugins;
    eggInfo.config = loader.config;
  }
}

process.stdout.write(JSON.stringify(eggInfo));

function hookLoader(config, inject: string) {
  config.customLoader = config.customLoader || {};
  return (directory, property, opt) => {
    if (!config.customLoader.hasOwnProperty(property)) {
      config.customLoader[property] = {
        directory,
        inject,
        ...opt,
      };
    }
  };
}

/* istanbul ignore next */
function noop() {}

function findArgs(name: string) {
  const key = `--${name}`;
  const result = process.argv.find(a => a.startsWith(key));
  return result ? result.substring(key.length + 1) : undefined;
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
