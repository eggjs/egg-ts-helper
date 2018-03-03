#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packInfo = require("../package.json");
const _1 = require("./");
const argv = process.argv;
// show help
if (findInArgv(false, '-h', '--help')) {
    console.info(`
Usage: tsh [options]
Options:
   -h, --help             usage
   -v, --version          show version
   -w, --watch            watch file change
   -c, --cwd [path]       egg application base dir(default: process.cwd)
   -f, --framework [name] egg framework(default: egg)
   -s, --silent           no log
  `);
    process.exit(0);
}
else if (findInArgv(false, '-v', '--version')) {
    console.info(packInfo.version);
    process.exit(0);
}
const watchFiles = findInArgv(false, '-w', '--watch') === 'true';
const tsHelper = new _1.default({
    cwd: findInArgv(true, '-c', '--cwd') || _1.defaultConfig.cwd,
    framework: findInArgv(true, '-f', '--framework') || _1.defaultConfig.framework,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSw0Q0FBNEM7QUFDNUMseUJBQXdEO0FBQ3hELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFFMUIsWUFBWTtBQUNaLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDOzs7Ozs7Ozs7R0FTWixDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUM7QUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLE1BQU0sQ0FBQztBQUNqRSxNQUFNLFFBQVEsR0FBRyxJQUFJLFVBQVEsQ0FBQztJQUM1QixHQUFHLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksZ0JBQWEsQ0FBQyxHQUFHO0lBQ3pELFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxnQkFBYSxDQUFDLFNBQVM7SUFDM0UsS0FBSyxFQUFFLFVBQVU7Q0FDbEIsQ0FBQyxDQUFDO0FBRUgsRUFBRSxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRTtRQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDeEUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsb0JBQW9CLFFBQWlCLEVBQUUsR0FBRyxJQUFjO0lBQ3RELEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDNUIsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2hELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2hCLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMifQ==