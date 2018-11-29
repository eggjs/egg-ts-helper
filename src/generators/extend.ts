import * as d from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratorResult, TsGenConfig, TsHelperConfig } from '..';
const debug = d('egg-ts-helper#generators_extend');

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = !config.file
    ? config.fileList
    : config.file.endsWith('.ts')
    ? [config.file]
    : [];

  debug('file list : %o', fileList);
  if (!fileList.length && !config.file) {
    // clean files
    return Object.keys(config.interface).map(key => ({
      dist: path.resolve(config.dtsDir, `${key}.d.ts`),
    }));
  }

  const tsList: GeneratorResult[] = [];
  fileList.forEach(f => {
    const basename = path.basename(f, '.ts');
    const m = basename.split('.');
    const interfaceNameKey = m[0];
    const interfaceEnvironment = m[1]
      ? m[1].replace(/^[a-z]/, r => r.toUpperCase())
      : '';
    const interfaceName = config.interface[interfaceNameKey];
    if (!interfaceName) {
      return;
    }

    const dist = path.resolve(config.dtsDir, `${basename}.d.ts`);
    f = path.resolve(config.dir, f);
    if (!fs.existsSync(f)) {
      return tsList.push({ dist });
    }

    let tsPath = path.relative(config.dtsDir, f).replace(/\/|\\/g, '/');
    tsPath = tsPath.substring(0, tsPath.lastIndexOf('.'));

    debug('import extendObject from %s', tsPath);
    const typeName = `Extend${interfaceEnvironment}${interfaceName}`;
    tsList.push({
      dist,
      content:
        `import ${typeName} from '${tsPath}';\n` +
        `declare module \'${baseConfig.framework}\' {\n` +
        `  type ${typeName}Type = typeof ${typeName};\n` +
        `  interface ${interfaceName} extends ${typeName}Type { }\n` +
        '}',
    });
  });

  return tsList;
}
