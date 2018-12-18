import cluster from 'cluster';
import d from 'debug';
import fs from 'fs';
import path from 'path';
import processExists from 'process-exists';
import { createTsHelperInstance } from './';
import { cleanJs } from './utils';
const debug = d('egg-ts-helper#register');
const cacheFileDir = path.resolve(__dirname, '../.cache');

// make sure ets only run once
if (cluster.isMaster) {
  let existPid: number | undefined;
  if (fs.existsSync(cacheFileDir)) {
    existPid = +fs.readFileSync(cacheFileDir).toString();
  }

  if (!existPid) {
    register();
  } else {
    processExists(existPid).then(exists => {
      if (!exists) {
        register();
      } else {
        debug('process %s was exits, ignore register', existPid);
      }
    });
  }
}

// start to register
function register() {
  // clean local js file at first.
  // because egg-loader cannot load the same property name to egg.
  cleanJs(process.cwd());

  // exec building
  createTsHelperInstance({ watch: true }).build();

  // cache pid
  fs.writeFileSync(cacheFileDir, process.pid);
}
