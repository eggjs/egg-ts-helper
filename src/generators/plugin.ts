import path from 'path';
import { declMapping } from '../config';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

export const isPrivate = true;

// only load plugin.ts|plugin.local.ts|plugin.default.ts
export const defaultConfig = {
  pattern: 'plugin*(.local|.default).+(ts|js)',
  interface: declMapping.plugin,
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const getContent = (eggInfo: utils.EggInfoResult) => {
    const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
    if (!eggInfo.plugins) {
      return { dist };
    }

    const appPluginNameList: string[] = [];
    const importContent: string[] = [];
    const framework = config.framework || baseConfig.framework;
    Object.keys(eggInfo.plugins).forEach(name => {
      const pluginInfo = eggInfo.plugins![name];
      if (pluginInfo.package && pluginInfo.from) {
        appPluginNameList.push(name);
        if (pluginInfo.enable) {
          importContent.push(`import '${pluginInfo.package || pluginInfo.path}';`);
        }
      }
    });

    if (!appPluginNameList.length) {
      return { dist };
    }

    const composeInterface = (list: string[]) => {
      return `    ${list
        .map(name => `${utils.isIdentifierName(name) ? name : `'${name}'`}?: EggPluginItem;`)
        .join('\n    ')}`;
    };

    return {
      dist,

      content: `${importContent.join('\n')}\n` +
        `import { EggPluginItem } from '${framework}';\n` +
        `declare module '${framework}' {\n` +
        `  interface ${config.interface} {\n` +
        `${composeInterface(Array.from(new Set(appPluginNameList)))}\n` +
        '  }\n' +
        '}',
    };
  };

  return utils.getEggInfo({
    cwd: baseConfig.cwd,
    customLoader: baseConfig.customLoader,
    async: !!config.file,
    callback: getContent,
  });
}
