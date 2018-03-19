#! /usr/bin/env node

import * as packInfo from '../package.json';
import { default as TsHelper, defaultConfig } from './';
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
      'ignore dir, your can ignore multiple dirs with comma like: -i proxy,controller',
    value: true,
    valueName: 'dir',
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
  const optionInfo = helpTxtList.map(
    (item, index) =>
      `   ${item}${repeat(' ', maxLen - item.length)}   ${options[index].desc}`,
  ).join('\n');

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

const tsHelper = new TsHelper({
  cwd: argOption.cwd,
  framework: argOption.framework,
  watch: watchFiles,
  watchDirs,
});

if (!argOption.silent) {
  tsHelper.on('update', p => {
    console.info(`[${packInfo.name}] ${p} generated`);
  });

  tsHelper.on('change', p => {
    console.info(`[${packInfo.name}] ${p} changed, trigger regenerating`);
  });
}

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
