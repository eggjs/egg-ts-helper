import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import ClassGenerator from './class';

export default function FunctionGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'ReturnType<typeof {{ 0 }}>';
  return ClassGenerator(config, baseConfig);
}

FunctionGenerator.defaultConfig = utils.extend({}, ClassGenerator.defaultConfig);
