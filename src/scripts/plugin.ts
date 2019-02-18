/**
 * Getting plugin info in child_process to prevent effecting egg application( splitting scopes ).
 */

import fs from 'fs';
import { requireFile } from '../utils';
import * as eggUtils from 'egg-utils';
const url = process.argv[2];
const stat = fs.statSync(url);
let pluginInfos;

if (stat.isDirectory()) {
  const framework = eggUtils.getFrameworkOrEggPath(url);
  if (!framework) {
    process.exit(0);
  }

  pluginInfos = eggUtils.getPlugins({
    baseDir: url,
    framework,
    env: 'local',
  });
} else if (stat.isFile()) {
  pluginInfos = {};
  const config = requireFile(url);
  for (const name in config) {
    const plugin = config[name];
    if (typeof plugin === 'boolean') {
      pluginInfos[name] = { enable: plugin };
    } else {
      pluginInfos[name] = {};
      [ 'package', 'enable' ].forEach(k => {
        if (k in plugin) { pluginInfos[name][k] = plugin[k]; }
      });
    }
  }
}

process.stdout.write(JSON.stringify(pluginInfos));
