import cluster from 'cluster';
import d from 'debug';
import { get as deepGet } from 'dot-prop';
import { createTsHelperInstance } from './';
import * as util from './utils';
const debug = d('egg-ts-helper#register');

/* istanbul ignore else */
if (cluster.isMaster) {
  // make sure ets only run once
  const pid = process.env.ETS_REGISTER_PID;
  if (pid) {
    debug('egg-ts-helper watcher has ran in %s', pid);
  } else {
    register(util.convertString(process.env.ETS_WATCH, process.env.NODE_ENV !== 'test'));
  }
}

// start to register
function register(watch: boolean) {
  const cwd = process.cwd();
  if (util.checkMaybeIsJsProj(cwd)) {
    // write jsconfig if the project is wrote by js
    util.writeJsConfig(cwd);
  } else {
    const tsNodeMode = deepGet(util.getPkgInfo(cwd), 'egg.typescript') ||
      process.argv.includes('--ts') ||
      process.argv.includes('--typescript') ||
      process.env.EGG_TYPESCRIPT === 'true';

    // no need to clean in js project
    // clean local js file at first.
    // because egg-loader cannot load the same property name to egg.
    if (tsNodeMode) {
      util.cleanJs(cwd);
    }
  }

  if (watch) {
    // cache pid to env, prevent child process executing ets again
    process.env.ETS_REGISTER_PID = `${process.pid}`;
  }

  // exec building
  createTsHelperInstance({ watch }).build();
}
