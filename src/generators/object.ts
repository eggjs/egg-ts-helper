import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import { defaultConfig as classDefaultConfig, default as classGen } from './class';

export const defaultConfig = utils.extend({}, classDefaultConfig);

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'typeof {{ 0 }}';
  return classGen(config, baseConfig);
}
