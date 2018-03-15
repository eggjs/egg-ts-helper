"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const d = require("debug");
const glob = require("glob");
const path = require("path");
const debug = d('egg-ts-helper#generators_class');
function default_1(tsHelper) {
    tsHelper.register('class', (config, baseConfig) => {
        const dtsDir = path.resolve(baseConfig.typings, path.relative(baseConfig.cwd, config.dir));
        let fileList = glob.sync('**/*.@(js|ts)', { cwd: config.dir });
        const dist = path.resolve(dtsDir, 'index.d.ts');
        // filter d.ts and the same name ts/js
        fileList = fileList.filter(f => {
            return !(f.endsWith('.d.ts') ||
                (f.endsWith('.js') &&
                    fileList.includes(f.substring(0, f.length - 2) + 'ts')));
        });
        debug('file list : %o', fileList);
        if (!fileList.length) {
            return { dist };
        }
        // using to compose import code
        let importStr = '';
        // using to create interface mapping
        const interfaceMap = {};
        fileList.forEach(f => {
            f = f.substring(0, f.lastIndexOf('.'));
            const props = f.split(path.sep).map(prop => 
            // transfer _ to uppercase
            prop.replace(/[_-][a-z]/gi, s => s.substring(1).toUpperCase()));
            // composing moduleName
            const moduleName = props
                .map(prop => prop[0].toUpperCase() + prop.substring(1))
                .join('');
            const tsPath = path
                .relative(dtsDir, path.join(config.dir, f))
                .replace(/\/|\\/g, '/');
            debug('import %s from %s', moduleName, tsPath);
            importStr += `import ${moduleName} from '${tsPath}';\n`;
            // create mapping
            let collector = interfaceMap;
            while (props.length) {
                const name = camelProp(props.shift(), baseConfig.caseStyle);
                if (!props.length) {
                    collector[name] = moduleName;
                }
                else {
                    collector = collector[name] = collector[name] || {};
                }
            }
        });
        return {
            dist,
            content: `${importStr}\n` +
                `declare module '${baseConfig.framework}' {\n` +
                `  interface ${config.interface} {\n` +
                composeInterface(interfaceMap, '    ') +
                '  }\n' +
                '}\n',
        };
    });
}
exports.default = default_1;
function composeInterface(obj, indent = '') {
    let str = '';
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (typeof val === 'string') {
            str += `${indent + key}: ${val};\n`;
        }
        else {
            const newVal = composeInterface(val, indent + '  ');
            if (newVal) {
                str += `${indent + key}: {\n${newVal + indent}};\n`;
            }
        }
    });
    return str;
}
// like egg-core/file-loader
function camelProp(property, caseStyle) {
    let first = property[0];
    // istanbul ignore next
    switch (caseStyle) {
        case 'lower':
            first = first.toLowerCase();
            break;
        case 'upper':
            first = first.toUpperCase();
            break;
        case 'camel':
        default:
    }
    return first + property.substring(1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZ2VuZXJhdG9ycy9jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJCQUEyQjtBQUMzQiw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBRTdCLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRWxELG1CQUF3QixRQUFrQjtJQUN4QyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsRUFBRTtRQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUN6QixVQUFVLENBQUMsT0FBTyxFQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUMxQyxDQUFDO1FBRUYsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFaEQsc0NBQXNDO1FBQ3RDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxDQUFDLENBQ04sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQ2hCLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUMxRCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsZ0JB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