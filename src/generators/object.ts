import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';
import * as utils from '../utils';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = utils.preWrapHandle(
    val => `typeof ${val}`,
    utils.strToFn(config.interfaceHandle),
  );

  return classGen(config, baseConfig);
}
