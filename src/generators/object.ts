import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = val => `typeof ${val}`;
  return classGen(config, baseConfig);
}
