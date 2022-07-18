import cluster from 'cluster';
import d from 'debug';
import TsHelper from './';
import * as util from './utils';
const debug = d('egg-ts-helper#register');

export default class Register {
  tsHelperClazz: typeof TsHelper;

  constructor(options?: { tsHelperClazz?: typeof TsHelper; }) {
    this.tsHelperClazz = options?.tsHelperClazz || TsHelper;
  }

  init() {
    /* istanbul ignore else */
    if (!cluster.isMaster) return;

    // make sure ets only run once
    const pid = process.env.ETS_REGISTER_PID;
    if (pid) {
      return debug('egg-ts-helper watcher has ran in %s', pid);
    }

    const watch = util.convertString(process.env.ETS_WATCH, process.env.NODE_ENV !== 'test');
    const clazz = this.tsHelperClazz;
    const cwd = process.cwd();
    const instance = new clazz({ watch });

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

    if (watch) {
      // cache pid to env, prevent child process executing ets again
      process.env.ETS_REGISTER_PID = `${process.pid}`;
    }

    // exec building
    instance.build();
  }
}
