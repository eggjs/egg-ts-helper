import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import { defaultConfig as classDefaultConfig, default as classGen } from './class';

export const defaultConfig = utils.extend({}, classDefaultConfig);

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'AutoInstanceType<typeof {{ 0 }}>';

  const result = classGen(config, baseConfig);
  /* istanbul ignore else */
  if (result.content) {
    result.content = [
      'type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;',
      result.content,
    ].join('\n');
  }

  return result;
}
