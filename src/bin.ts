#! /usr/bin/env node

import * as packInfo from '../package.json';
import { createTsHelperInstance, defaultConfig } from './';
const argv = process.argv;
const options = [
  { name: 'help', alias: 'h', desc: 'usage' },
  { name: 'version', alias: 'v', desc: 'show version' },
  { name: 'watch', alias: 'w', desc: 'watch file change' },
  {
    name: 'cwd',
    alias: 'c',
    desc: 'egg application base dir (default: process.cwd)',
    value: true,
    valueName: 'path',
    default: defaultConfig.cwd,
  },
  {
    name: 'config',
    alias: 'C',
    desc:
      'configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: cwd/tshelper.json）',
    value: true,
    valueName: 'path',
  },
  {
    name: 'framework',
    alias: 'f',
    desc: 'egg framework(default: egg)',
    value: true,
    valueName: 'name',
  },
  { name: 'silent', alias: 's', desc: 'disabled log' },
  {
    name: 'ignore',
    alias: 'i',
    desc:
      'ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service',
    value: true,
    valueName: 'dir',
  },
  {
    name: 'enabled',
    alias: 'e',
    desc:
      'enabled watchDirs, your can use multiple dirs with comma like: -e proxy,other',
    value: true,
    valueName: 'dir',
  },
  {
    name: 'extra',
    alias: 'E',
    desc: 'extra config, value type was a json string',
    value: true,
    valueName: 'json',
  },
];

let maxLen = 0;
const helpTxtList: string[] = [];
const argOption = {} as any;
options.forEach(item => {
  argOption[item.name] =
    findInArgv(!!item.value, `-${item.alias}`, `--${item.name}`) ||
    item.default ||
    '';

  // collect help info
  const txt = `-${item.alias}, --${item.name}${
    item.value ? ` [${item.valueName || 'value'}]` : ''
  }`;
  helpTxtList.push(txt);
  maxLen = txt.length > maxLen ? txt.length : maxLen;
});

// show help info
if (argOption.help) {
  const optionInfo = helpTxtList
    .map(
      (item, index) =>
        `   ${item}${repeat(' ', maxLen - item.length)}   ${
          options[index].desc
        }`,
    )
    .join('\n');

  console.info(`
Usage: ets [options]
Options:
${optionInfo}
`);

  process.exit(0);
} else if (argOption.version) {
  console.info(packInfo.version);
  process.exit(0);
}

const watchFiles = argOption.watch;
const watchDirs = {};
argOption.ignore.split(',').forEach(key => (watchDirs[key] = false));
argOption.enabled.split(',').forEach(key => (watchDirs[key] = true));

// extra config
const extraConfig = argOption.extra ? JSON.parse(argOption.extra) : {};

// create instance
createTsHelperInstance({
  cwd: argOption.cwd,
  framework: argOption.framework,
  watch: watchFiles,
  watchDirs,
  configFile: argOption.config,
  ...extraConfig,
})
  .on('update', p => {
    if (!argOption.silent) {
      console.info(`[${packInfo.name}] ${p} created`);
    }
  })
  .build();

function repeat(str, times) {
  return Array(times + 1).join(str);
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
