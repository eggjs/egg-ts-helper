#! /usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import packInfo from '../package.json';
import { createTsHelperInstance, defaultConfig } from './';
import { loadModules } from './utils';
const commands = loadModules<SubCommand>(path.resolve(__dirname, './cmd'), true);
let executeCmd: string | undefined;

// override executeSubCommand to support async subcommand.
Command.prototype.addImplicitHelpCommand = () => {};
Command.prototype.executeSubCommand = async function(argv, args, unknown) {
  const cwd = this.cwd || defaultConfig.cwd;
  const command = commands[executeCmd!];
  if (!command) {
    throw new Error(executeCmd + ' does not exist');
  }

  await command.run(this, { cwd, argv, args: args.filter(item => item !== this), unknown });
};

const program = new Command()
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

if (!process.argv.slice(2).length) {
  execute();
} else {
  Object.keys(commands).forEach(cmd => {
    const subCommand = commands[cmd];
    const cmdName = subCommand.options ? `${cmd} ${subCommand.options}` : cmd;
    program.command(cmdName, subCommand.description)
      .action(command => executeCmd = command);
  });

  program.parse(process.argv);

  if (!executeCmd) {
    execute();
  }
}

// execute fn
function execute() {
  const watchFiles = program.watch;
  const watchDirs = {};
  (program.ignore || '').split(',').forEach(key => (watchDirs[key] = false));
  (program.enabled || '').split(',').forEach(key => (watchDirs[key] = true));

  const tsHelperConfig = {
    cwd: program.cwd || defaultConfig.cwd,
    framework: program.framework,
    watch: watchFiles,
    watchDirs,
    configFile: program.config,
    ...(program.extra ? JSON.parse(program.extra) : {}),
  };

  // silent
  if (program.silent) {
    tsHelperConfig.silent = true;
  }

  // create instance
  const tsHelper = createTsHelperInstance(tsHelperConfig).build();

  if (program.oneForAll) {
    // create one for all
    tsHelper.createOneForAll(program.oneForAll);
  }
}
