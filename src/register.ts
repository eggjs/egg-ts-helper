import cluster from 'cluster';
import d from 'debug';
import TsHelper, { TsHelperOption } from './core';
import * as util from './utils';
const debug = d('egg-ts-helper#register');

export interface RegisterOption {
  tsHelperClazz?: typeof TsHelper;
}

export default class Register {
  tsHelperClazz: typeof TsHelper;

  constructor(options?: RegisterOption) {
    this.tsHelperClazz = options?.tsHelperClazz || TsHelper;
  }

  init(options?: TsHelperOption) {
    /* istanbul ignore else */
    if (!cluster.isMaster) return;

    // make sure ets only run once
    const pid = process.env.ETS_REGISTER_PID;
    if (pid) {
      return debug('egg-ts-helper watcher has ran in %s', pid);
    }

    const watch = util.convertString(process.env.ETS_WATCH, process.env.NODE_ENV !== 'test');
    const clazz = this.tsHelperClazz;
    const cwd = options?.cwd || process.cwd();
    const instance = new clazz({ watch, ...options });

    if (util.checkMaybeIsJsProj(cwd)) {
      // write jsconfig if the project is wrote by js
      util.writeJsConfig(cwd);
    } else {
      const tsNodeMode = process.env.EGG_TYPESCRIPT === 'true';

      // no need to clean in js project
      // clean local js file at first.
      // because egg-loader cannot load the same property name to egg.
      if (tsNodeMode && instance.config.autoRemoveJs) {
        util.cleanJs(cwd);
      }
    }

    // cache pid to env, prevent child process executing ets again
    process.env.ETS_REGISTER_PID = `${process.pid}`;

    // exec building
    instance.build();
  }
}

export { Register };
