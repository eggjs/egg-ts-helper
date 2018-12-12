import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'ReturnType<typeof {{ 0 }}>';
  return classGen(config, baseConfig);
}
