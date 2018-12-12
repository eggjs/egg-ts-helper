import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || (val => `ReturnType<typeof ${val}>`);
  return classGen(config, baseConfig);
}
