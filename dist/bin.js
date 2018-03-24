#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packInfo = require("../package.json");
const _1 = require("./");
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
        default: _1.defaultConfig.cwd,
    },
    {
        name: 'config',
        alias: 'C',
        desc: 'configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js',
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
        desc: 'ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service',
        value: true,
        valueName: 'dir',
    },
    {
        name: 'enabled',
        alias: 'e',
        desc: 'enabled watchDirs, your can use multiple dirs with comma like: -e proxy,other',
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
const helpTxtList = [];
const argOption = {};
options.forEach(item => {
    argOption[item.name] =
        findInArgv(!!item.value, `-${item.alias}`, `--${item.name}`) ||
            item.default ||
            '';
    // collect help info
    const txt = `-${item.alias}, --${item.name}${item.value ? ` [${item.valueName || 'value'}]` : ''}`;
    helpTxtList.push(txt);
    maxLen = txt.length > maxLen ? txt.length : maxLen;
});
// show help info
if (argOption.help) {
    const optionInfo = helpTxtList
        .map((item, index) => `   ${item}${repeat(' ', maxLen - item.length)}   ${options[index].desc}`)
        .join('\n');
    console.info(`
Usage: ets [options]
Options:
${optionInfo}
`);
    process.exit(0);
}
else if (argOption.version) {
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
_1.createTsHelperInstance(Object.assign({ cwd: argOption.cwd, framework: argOption.framework, watch: watchFiles, watchDirs, configFile: argOption.config }, extraConfig))
    .on('update', p => {
    if (!argOption.silent) {
        console.info(`[${packInfo.name}] ${p} created`);
    }
})
    .build();
function repeat(str, times) {
    return Array(times + 1).join(str);
}
function findInArgv(hasValue, ...args) {
    for (const arg of args) {
        const index = argv.indexOf(arg);
        if (index > 0) {
            if (hasValue) {
                const val = argv[index + 1];
                return !val || val.startsWith('-') ? '' : val;
            }
            else {
                return 'true';
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSw0Q0FBNEM7QUFDNUMseUJBQTJEO0FBQzNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDMUIsTUFBTSxPQUFPLEdBQUc7SUFDZCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO0lBQzNDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7SUFDckQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFO0lBQ3hEO1FBQ0UsSUFBSSxFQUFFLEtBQUs7UUFDWCxLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxpREFBaUQ7UUFDdkQsS0FBSyxFQUFFLElBQUk7UUFDWCxTQUFTLEVBQUUsTUFBTTtRQUNqQixPQUFPLEVBQUUsZ0JBQWEsQ0FBQyxHQUFHO0tBQzNCO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxHQUFHO1FBQ1YsSUFBSSxFQUNGLHVIQUF1SDtRQUN6SCxLQUFLLEVBQUUsSUFBSTtRQUNYLFNBQVMsRUFBRSxNQUFNO0tBQ2xCO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsV0FBVztRQUNqQixLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSw2QkFBNkI7UUFDbkMsS0FBSyxFQUFFLElBQUk7UUFDWCxTQUFTLEVBQUUsTUFBTTtLQUNsQjtJQUNELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7SUFDcEQ7UUFDRSxJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxHQUFHO1FBQ1YsSUFB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