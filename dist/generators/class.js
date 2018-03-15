"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const glob = require("glob");
const path = require("path");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZ2VuZXJhdG9ycy9jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZCQUE2QjtBQUM3Qiw2QkFBNkI7QUFHN0IsbUJBQXdCLFFBQWtCO0lBQ3hDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQ3pCLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQzFDLENBQUM7UUFFRixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMvRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVoRCxzQ0FBc0M7UUFDdEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxDQUFDLENBQUMsQ0FDTixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztvQkFDaEIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQzFELENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLEVBQUUsSUFB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