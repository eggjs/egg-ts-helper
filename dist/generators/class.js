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
            const props = f.split('/').map(prop => 
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