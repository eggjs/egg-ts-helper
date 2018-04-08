import { exec, fork } from 'child_process';
import * as cluster from 'cluster';
import * as path from 'path';
import { createTsHelperInstance } from './';
import { cleanJs } from './utils';

// only works in master
if (
  cluster.isMaster &&
  !process.argv.find(item => item.includes('agent_worker.js'))
) {
  // fork a process to watch files change
  const ps = fork(path.resolve(__dirname, './bin'), ['-w'], {
    execArgv: [],
  });

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
}
