import * as d from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import TsHelper from '..';
import * as utils from '../utils';
const debug = d('egg-ts-helper#generators_plugin');

const cache: { [key: string]: string[] } = {};
const pluginRegex = /package\:\s*(?:'|")([^'"]+)(?:'|")/;

export default function(tsHelper: TsHelper) {
  tsHelper.register('plugin', (config, baseConfig) => {
    const fileList = utils.loadFiles(config.dir, config.pattern);
    const dist = path.resolve(config.dtsDir, 'plugin.d.ts');
    if (!fileList.length) {
      return { dist };
    }

    let importList: string[] = [];
    fileList.forEach(f => {
      const abUrl = path.resolve(config.dir, f);

      // read from cache
      if (!cache[abUrl] || config.file === abUrl) {
        let fileContent = fs.readFileSync(abUrl).toString();
        let matches;
        const list: string[] = (cache[abUrl] = []);

        while ((matches = fileContent.match(pluginRegex))) {
          const packageName = matches[1];
          const packagePath = path.resolve(baseConfig.cwd, 'node_modules/' + packageName);
          if (fs.existsSync(packagePath)) {
            list.push(packageName);
            importList.push(packageName);
          } else {
            debug('package \'%s\' not found in %s', packageName, baseConfig.cwd);
            return;
          }

          fileContent = fileContent.substring(
            matches.index + matches[0].length,
          );
        }
      } else {
        importList = importList.concat(cache[abUrl]);
      }
    });

    if (!importList.length) {
      return { dist };
    }

    return {
      dist,

      // remove duplicate before map
      content: Array.from(new Set(importList))
        .map(p => `import '${p}';`)
        .join('\n'),
    };
  });
}
