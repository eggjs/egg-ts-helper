#! /usr/bin/env node

import { Command } from 'commander';
import packInfo from '../package.json';
import { createTsHelperInstance, defaultConfig } from './';
import { cleanJs } from './utils';

const noArgv = !process.argv.slice(2).length;
const oldParseArgs = Command.prototype.parseArgs;
Command.prototype.parseArgs = function(args: string[], unknown) {
  return noArgv ? this : oldParseArgs.call(this, args, unknown);
};

const program = new Command();

program
  .version(packInfo.version, '-v, --version')
  .usage('[commands] [options]')
  .option('-w, --watch', 'Watching files, d.ts would recreated while file changed')
  .option('-c, --cwd [path]', 'Egg application base dir (default: process.cwd)')
  .option('-C, --config [path]', 'Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js')
  .option('-f, --framework [name]', 'Egg framework(default: egg)')
  .option('-o, --oneForAll [path]', 'Create a d.ts import all types (default: typings/ets.d.ts)')
  .option('-s, --silent', 'Running without output')
  .option('-i, --ignore [dirs]', 'Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service')
  .option('-e, --enabled [dirs]', 'Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other')
  .option('-E, --extra [json]', 'Extra config, the value should be json string');

let cmd: string | undefined;
program
  .command('clean', 'Clean js file while it has the same name ts file')
  .action(command => cmd = command);

program.parse(process.argv);

// clean js file.
const cwd = program.cwd || defaultConfig.cwd;
if (cmd === 'clean') {
  cleanJs(cwd);
  process.exit(0);
} else {
  execute();
}

// execute fn
function execute() {
  const watchFiles = program.watch;
  const watchDirs = {};
  (program.ignore || '').split(',').forEach(key => (watchDirs[key] = false));
  (program.enabled || '').split(',').forEach(key => (watchDirs[key] = true));

  const extraConfig = program.extra ? JSON.parse(program.extra) : {};

  // create instance
  const tsHelper = createTsHelperInstance({
    cwd,
    framework: program.framework,
    watch: watchFiles,
    watchDirs,
    configFile: program.config,
    ...extraConfig,
  })
    .on('update', p => {
      if (program.silent) {
        return;
      }

      console.info(`[${packInfo.name}] ${p} created`);
    });

  tsHelper.build();

  if (program.oneForAll) {
    // create one for all
    tsHelper.createOneForAll(program.oneForAll);
  }
}
