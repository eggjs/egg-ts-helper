import path from 'path';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

// only load plugin.ts|plugin.local.ts|plugin.default.ts
export const defaultConfig = {
  pattern: 'plugin(.local|.default|).(ts|js)',
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
  const eggInfo = utils.getEggInfo(baseConfig.cwd);
  if (!eggInfo.plugins) {
    return { dist };
  }

  const pluginKeys = Object.keys(eggInfo.plugins);
  const pluginList = pluginKeys.filter(name => !!eggInfo.plugins[name].package);
  const appPluginNameList: string[] = pluginKeys.filter(p => eggInfo.plugins[p].package);
  const framework = config.framework || baseConfig.framework;
  const importContent = Array.from(new Set(pluginList)).map(p => `import '${p}';`).join('\n');
  const composeInterface = (list: string[]) => {
    return `    ${list
      .map(name => `${utils.isIdentifierName(name) ? name : `'${name}'` }?: EggPluginItem;`)
      .join('\n    ')}`;
  };

  return {
    dist,

    content: `${importContent}\n` +
      `import { EggPluginItem } from '${framework}';\n` +
      `declare module '${framework}' {\n` +
      '  interface EggPlugin {\n' +
      `${composeInterface(Array.from(new Set(appPluginNameList)))}\n` +
      '  }\n' +
      '}',
  };
}
