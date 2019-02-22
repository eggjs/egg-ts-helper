import path from 'path';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import fs from 'fs';
import extend from 'extend2';
import { execSync } from 'child_process';

// only load plugin.ts|plugin.local.ts|plugin.default.ts
export const defaultConfig = {
  pattern: 'plugin(.local|.default|).(ts|js)',
};

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
  const { pluginList, pluginInfos } = getPluginInfo(baseConfig.cwd, config.file);
  const appPluginNameList: string[] = Object.keys(pluginInfos).filter(p => pluginInfos[p].package);

  if (!pluginList.length) {
    return { dist };
  }

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

type Plugins = PlainObject<{ package: string; from: string; enable: boolean; }>;

// get framework plugin list
interface FindPluginResult {
  pluginList: string[];
  pluginInfos: Plugins;
}

function getPluginByScripts(url: string): Plugins {
  try {
    // executing scripts to get eggInfo
    const info = execSync(`ts-node --transpile-only ./scripts/plugin ${url}`, {
      cwd: path.resolve(__dirname, '../'),
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        EGG_TYPESCRIPT: 'true',
      },
    });

    const jsonStr = info.toString();
    if (jsonStr) {
      return JSON.parse(jsonStr);
    } else {
      return {};
    }
  } catch (e) {
    return {};
  }
}

const pluginCache: PlainObject<Plugins> = {};
function getAllPluginInfo(cwd: string) {
  if (pluginCache[cwd]) {
    return pluginCache[cwd];
  } else {
    const allPlugin = getPluginByScripts(cwd);
    pluginCache[cwd] = allPlugin;
    return allPlugin;
  }
}

export function getPluginInfo(cwd: string, file?: string): FindPluginResult {
  const allPlugin = getAllPluginInfo(cwd);
  let pluginInfos = allPlugin;
  if (file) {
    const fileExist = fs.existsSync(file);
    const filePluginInfo = fileExist ? getPluginByScripts(file) : {};
    pluginInfos = extend({}, allPlugin, filePluginInfo);
  }

  const pluginList: string[] = [];
  Object.keys(pluginInfos).forEach(name => {
    const pluginInfo = pluginInfos[name];
    if (pluginInfo.enable && pluginInfo.package) {
      pluginList.push(pluginInfo.package);
    }
  });

  return {
    pluginList,
    pluginInfos,
  };
}
