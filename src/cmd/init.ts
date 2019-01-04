import { prompt } from 'enquirer';
import * as utils from '../utils';
import path from 'path';
import fs from 'fs';
import { createTsHelperInstance } from '../';

const TYPE_TS = 'typescript';
const TYPE_JS = 'javascript';
const JS_CONFIG = {
  include: [ '**/*' ],
  exclude: [
    'node_modules/',
    'app/web/',
    'app/view/',
    'public/',
    'app/mocks/',
    'coverage/',
    'logs/',
  ],
};
const TS_CONFIG = {
  compilerOptions: {
    target: 'es2017',
    module: 'commonjs',
    strict: true,
    noImplicitAny: false,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
    charset: 'utf8',
    allowJs: false,
    pretty: true,
    lib: [ 'es6' ],
    noEmitOnError: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    strictPropertyInitialization: false,
    noFallthroughCasesInSwitch: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    inlineSourceMap: true,
  },
};

class InitCommand implements SubCommand {
  description = 'Init egg-ts-helper in your existing project';

  options = '<type>';

  async run(_, { args, cwd }: SubCommandOption) {
    let type = args[1];
    const pkgInfo = utils.getPkgInfo(cwd);
    const jsconfigPath = path.resolve(cwd, './jsconfig.json');
    const jsConfigExist = fs.existsSync(jsconfigPath);

    pkgInfo.egg = pkgInfo.egg || {};

    // verify type
    if (![ TYPE_TS, TYPE_JS ].includes(type)) {
      const result = await prompt<{ type: string }>({
        type: 'autocomplete',
        name: 'type',
        message: 'Choose the type of your project',
        choices: jsConfigExist ? [ TYPE_JS, TYPE_TS ] : [ TYPE_TS, TYPE_JS ],
      }).catch(() => ({ type: '' }));

      type = result.type;
    }

    /** istanbul ignore else */
    if (type === TYPE_JS) {
      // create jsconfig.json
      if (!jsConfigExist) {
        utils.log('create ' + jsconfigPath);
        fs.writeFileSync(jsconfigPath, JSON.stringify(JS_CONFIG, null, 2));
      }
    } else if (type === TYPE_TS) {
      pkgInfo.egg.typescript = true;

      // create tsconfig.json
      const tsconfigPath = path.resolve(cwd, './tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) {
        utils.log('create ' + tsconfigPath);
        fs.writeFileSync(tsconfigPath, JSON.stringify(TS_CONFIG, null, 2));
      }
    } else {
      return;
    }

    // add egg-ts-helper/register to egg.require
    pkgInfo.egg.require = pkgInfo.egg.require || [];
    if (!pkgInfo.egg.require.includes('egg-ts-helper/register')) {
      pkgInfo.egg.require.push('egg-ts-helper/register');
    }

    // write package.json
    const pkgDist = path.resolve(cwd, './package.json');
    fs.writeFileSync(pkgDist, JSON.stringify(pkgInfo, null, 2));
    utils.log('change ' + pkgDist);

    // build once
    utils.log('create d.ts ...');
    createTsHelperInstance({ cwd }).build();
    utils.log('complete initialization');
  }
}

export default new InitCommand();
