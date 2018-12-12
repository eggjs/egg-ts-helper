import { TsGenConfig, TsHelperConfig } from '..';
import classGen from './class';
import * as utils from '../utils';

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = utils.preWrapHandle(
    val => `AutoInstanceType<typeof ${val}>`,
    utils.strToFn(config.interfaceHandle),
  );

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
