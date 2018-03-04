#! /usr/bin/env node

import * as packInfo from '../package.json';
import { default as TsHelper, defaultConfig } from './';
const argv = process.argv;

// show help
if (findInArgv(false, '-h', '--help')) {
  console.info(`
Usage: ets [options]
Options:
   -h, --help             usage
   -v, --version          show version
   -w, --watch            watch file change
   -c, --cwd [path]       egg application base dir(default: process.cwd)
   -f, --framework [name] egg framework(default: egg)
   -s, --silent           no log
  `);

  process.exit(0);
} else if (findInArgv(false, '-v', '--version')) {
  console.info(packInfo.version);
  process.exit(0);
}

const watchFiles = findInArgv(false, '-w', '--watch') === 'true';
const tsHelper = new TsHelper({
  cwd: findInArgv(true, '-c', '--cwd') || defaultConfig.cwd,
  framework: findInArgv(true, '-f', '--framework') || defaultConfig.framework,
  watch: watchFiles,
});

if (watchFiles && !findInArgv(false, '-s', '--silent')) {
  tsHelper.on('update', p => {
    console.info(`[${packInfo.name}] ${p} generated`);
  });

  tsHelper.on('change', p => {
    console.info(`[${packInfo.name}] ${p} changed, trigger regenerating`);
  });
}

function findInArgv(hasValue: boolean, ...args: string[]) {
  for (const arg of args) {
    const index = argv.indexOf(arg);
    if (index > 0) {
      if (hasValue) {
        const val = argv[index + 1];
        return !val || val.startsWith('-') ? '' : val;
      } else {
        return 'true';
      }
    }
  }
}
