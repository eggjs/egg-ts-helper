"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const glob = require("globby");
// load ts/js files
function loadFiles(cwd) {
    const fileList = glob.sync(['**/*.(js|ts)', '!**/*.d.ts'], {
        cwd,
    });
    return fileList.filter(f => {
        // filter same name js/ts
        return !(f.endsWith('.js') &&
            fileList.includes(f.substring(0, f.length - 2) + 'ts'));
    });
}
exports.loadFiles = loadFiles;
// require modules
function requireFile(url) {
    if (!fs.existsSync(url)) {
        return undefined;
    }
    let exp = require(url);
    if (exp.__esModule && 'default' in exp) {
        exp = exp.default;
    }
    if (typeof exp === 'function') {
        exp = exp();
    }
    return exp;
}
exports.requireFile = requireFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5QkFBeUI7QUFDekIsK0JBQStCO0FBRS9CLG1CQUFtQjtBQUNuQixtQkFBMEIsR0FBRztJQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxFQUFFO1FBQ3pELEdBQUc7S0FDSixDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUN6Qix5QkFBeUI7UUFDekIsTUFBTSxDQUFDLENBQUMsQ0FDTixDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUNqQixRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQ3ZELENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFaRCw4QkFZQztBQUVELGtCQUFrQjtBQUNsQixxQkFBNEIsR0FBRztJQUM3QixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFNBQVMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzlCLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQWZELGtDQWVDIn0=