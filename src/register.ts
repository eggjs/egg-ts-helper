import cluster from 'cluster';
import d from 'debug';
import fs from 'fs';
import path from 'path';
import processExists from 'process-exists';
import { createTsHelperInstance } from './';
import * as util from './utils';
const debug = d('egg-ts-helper#register');
const cacheFile = path.resolve(__dirname, '../.cache');
const shouldWatch = util.convertString(process.env.ETS_WATCH, process.env.NODE_ENV !== 'test');

/* istanbul ignore else */
if (cluster.isMaster) {
  // make sure ets only run once
  let existPid: number | undefined;
  if (fs.existsSync(cacheFile)) {
    existPid = +fs.readFileSync(cacheFile).toString();
  }

  if (!existPid || !shouldWatch) {
    register(shouldWatch);
  } else {
    processExists(existPid).then(exists => {
      if (!exists) {
        register(true);
      } else {
        debug('process %s was exits, ignore register', existPid);
      }
    });
  }
}

// start to register
function register(watch: boolean) {
  const cwd = process.cwd();
  if (util.checkMaybeIsJsProj(cwd)) {
    // write jsconfig if the project is wrote by js
    util.writeJsConfig(cwd);
  } else {
    // no need to clean in js project
    // clean local js file at first.
    // because egg-loader cannot load the same property name to egg.
    util.cleanJs(cwd);
  }

  // must cache pid before executing building
  if (watch) {
    fs.writeFileSync(cacheFile, process.pid);
  }

  // exec building
  createTsHelperInstance({ watch }).build();
}
