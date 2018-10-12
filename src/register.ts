import { exec, fork } from 'child_process';
import * as cluster from 'cluster';
import * as d from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as processExists from 'process-exists';
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
  const argv = ['-w'];
  if (process.env.NODE_ENV === 'test') {
    // silent in unittest
    argv.push('-s');
  }

  // fork a process to watch files change
  const ps = fork(path.resolve(__dirname, './bin'), argv, { execArgv: [] });

  // kill child process while process exit
  function close() {
    if (!ps.killed) {
      if (process.platform === 'win32') {
        exec('taskkill /pid ' + ps.pid + ' /T /F');
      } else {
        ps.kill('SIGHUP');
      }
    }
  }

  process.on('exit', close);
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
  process.on('SIGHUP', close);

  // clean local js file at first.
  // because egg-loader cannot load the same property name to egg.
  cleanJs(process.cwd());

  // exec building at first
  createTsHelperInstance().build();

  // cache pid
  fs.writeFileSync(cacheFileDir, process.pid);
}
