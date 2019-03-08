import path from 'path';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

// only load plugin.ts|plugin.local.ts|plugin.default.ts
export const defaultConfig = {
  pattern: 'plugin(.local|.default|).(ts|js)',
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  if (!config.file) {
    return getContent(utils.getEggInfo(baseConfig.cwd), config, baseConfig);
  } else {
    // async
    return utils.getEggInfo<'async'>(baseConfig.cwd, { async: true })
      .then(eggInfo => getContent(eggInfo, config, baseConfig));
  }
}

function getContent(eggInfo, config: TsGenConfig, baseConfig: TsHelperConfig) {
  const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
  if (!eggInfo.plugins) {
    return { dist };
  }

  const appPluginNameList: string[] = [];
  const importContent: string[] = [];
  const framework = config.framework || baseConfig.framework;
  Object.keys(eggInfo.plugins).forEach(name => {
    const pluginInfo = eggInfo.plugins[name];
    if (pluginInfo.package && pluginInfo.path) {
      appPluginNameList.push(name);
      if (pluginInfo.enable) {
        importContent.push(`import '${pluginInfo.package}';`);
      }
    }
  });

  const composeInterface = (list: string[]) => {
    return `    ${list
      .map(name => `${utils.isIdentifierName(name) ? name : `'${name}'` }?: EggPluginItem;`)
      .join('\n    ')}`;
  };

  return {
    dist,

    content: `${importContent.join('\n')}\n` +
      `import { EggPluginItem } from '${framework}';\n` +
      `declare module '${framework}' {\n` +
      '  interface EggPlugin {\n' +
      `${composeInterface(Array.from(new Set(appPluginNameList)))}\n` +
      '  }\n' +
      '}',
  };
}
