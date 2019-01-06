import cluster from 'cluster';
import d from 'debug';
import fs from 'fs';
import path from 'path';
import processExists from 'process-exists';
import { createTsHelperInstance } from './';
import { cleanJs } from './utils';
const debug = d('egg-ts-helper#register');
const cacheFile = path.resolve(__dirname, '../.cache');
const isTesting = process.env.NODE_ENV === 'test';

/* istanbul ignore else */
if (cluster.isMaster) {
  // make sure ets only run once
  let existPid: number | undefined;
  if (fs.existsSync(cacheFile)) {
    existPid = +fs.readFileSync(cacheFile).toString();
  }

  if (!existPid || isTesting) {
    register(!isTesting);
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
  // clean local js file at first.
  // because egg-loader cannot load the same property name to egg.
  cleanJs(process.cwd());

  // exec building
  createTsHelperInstance({ watch }).build();

  // cache pid
  if (watch) {
    fs.writeFileSync(cacheFile, process.pid);

    const clean = () => fs.existsSync(cacheFile) && fs.unlinkSync(cacheFile);

    // delete cache file on exit.
    process.once('beforeExit', clean);
    process.once('uncaughtException', clean);
    process.once('SIGINT', clean);
  }
}
