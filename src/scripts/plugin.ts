/**
 * Getting egg info in child_process to prevent effecting egg application( splitting scopes ).
 */

import * as eggUtils from 'egg-utils';
const cwd = process.argv[2];
const framework = eggUtils.getFrameworkOrEggPath(cwd);
if (!framework) {
  process.exit(0);
}

const pluginInfos = eggUtils.getPlugins({
  baseDir: cwd,
  framework,
  env: 'local',
});

process.stdout.write(JSON.stringify(pluginInfos));
