"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = require("path");
const _1 = require("./");
// fork a process to watch files change
const ps = child_process_1.fork(path.resolve(__dirname, './bin'), ['-w'], {
    execArgv: [],
});
// kill child process while process exit
function close() {
    if (!ps.killed) {
        ps.kill('SIGHUP');
    }
}
process.on('exit', close);
process.on('SIGINT', close);
process.on('SIGTERM', close);
process.on('SIGHUP', close);
// exec building at first
_1.createTsHelperInstance().build();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVnaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpREFBcUM7QUFDckMsNkJBQTZCO0FBQzdCLHlCQUE0QztBQUU1Qyx1Q0FBdUM7QUFDdkMsTUFBTSxFQUFFLEdBQUcsb0JBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ3hELFFBQVEsRUFBRSxFQUFFO0NBQ2IsQ0FBQyxDQUFDO0FBRUgsd0NBQXdDO0FBQ3hDO0lBQ0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNmLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEIsQ0FBQztBQUNGLENBQUM7QUFFRCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxQixPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM1QixPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3QixPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUU1Qix5QkFBeUI7QUFDekIseUJBQXNCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyJ9