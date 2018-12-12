import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'typeof {{ 0 }}';
  return classGen(config, baseConfig);
}
