"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const cluster = require("cluster");
const path = require("path");
const _1 = require("./");
// only works in master
if (cluster.isWorker) {
    process.exit(0);
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVnaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpREFBcUM7QUFDckMsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUM3Qix5QkFBNEM7QUFFNUMsdUJBQXVCO0FBQ3ZCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQztBQUVELHVDQUF1QztBQUN2QyxNQUFNLEVBQUUsR0FBRyxvQkFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDeEQsUUFBUSxFQUFFLEVBQUU7Q0FDYixDQUFDLENBQUM7QUFFSCx3Q0FBd0M7QUFDeEM7SUFDQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2YsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDO0FBQ0YsQ0FBQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFCLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVCLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzdCLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTVCLHlCQUF5QjtBQUN6Qix5QkFBc0IsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDIn0=