"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const babel_traverse_1 = require("babel-traverse");
const t = require("babel-types");
const babylon = require("babylon");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
function default_1(tsHelper) {
    tsHelper.register('extend', (config, baseConfig) => {
        const dtsDir = path.resolve(baseConfig.typings, path.relative(baseConfig.cwd, config.dir));
        let fileList;
        if (!config.file) {
            fileList = glob.sync('**/*.@(js|ts)', { cwd: config.dir });
            // filter d.ts and the same name ts/js
            fileList = fileList.filter(f => !(f.endsWith('.d.ts') || f.endsWith('.js')));
        }
        else {
            fileList = config.file.endsWith('.ts') ? [config.file] : [];
        }
        if (!fileList.length) {
            return;
        }
        const tsList = [];
        fileList.forEach(f => {
            const basename = path.basename(f, '.ts');
            const interfaceName = config.interface[basename];
            if (!interfaceName) {
                return;
            }
            const dist = path.resolve(dtsDir, `${basename}.d.ts`);
            f = path.resolve(config.dir, f);
            if (!fs.existsSync(f)) {
                return { dist };
            }
            const content = fs.readFileSync(f, {
                encoding: 'utf-8',
            });
            // parse ts
            const ast = babylon.parse(content, {
                sourceType: 'module',
                plugins: [
                    'typescript',
                    'exportNamespaceFrom',
                    'exportDefaultFrom',
                    'asyncGenerators',
                    'classProperties',
                ],
            });
            const properties = findReturnProperties(ast);
            if (!properties || !properties.length) {
                return;
            }
            let tsPath = path.relative(dtsDir, f).replace(/\/|\\/g, '/');
            tsPath = tsPath.substring(0, tsPath.lastIndexOf('.'));
            tsList.push({
                dist,
                content: `import ExtendObject from '${tsPath}';\n` +
                    'declare module \'egg\' {\n' +
                    `  interface ${interfaceName} {\n` +
                    properties
                        .map(prop => `    ${prop}: typeof ExtendObject.${prop};\n`)
                        .join('') +
                    '  }\n}',
            });
        });
        return tsList;
    });
}
exports.default = default_1;
function findReturnProperties(ast) {
    let properties;
    const cache = {};
    babel_traverse_1.default(ast, {
        enter(p) {
            // skip inner scope
            if (p.scope.parent) {
                return;
            }
            // collect variable declaration
            if (t.isVariableDeclaration(p.node)) {
                const declarations = p.node.declarations;
                declarations.forEach(declaration => {
                    // const abc = {};
                    if (t.isIdentifier(declaration.id) &&
                        t.isObjectExpression(declaration.init)) {
                        cache[declaration.id.name] = declaration.init;
                    }
                });
            }
            else if (t.isAssignmentExpression(p.node)) {
                // let abc;
                // abc = {};
                if (t.isIdentifier(p.node.left) && t.isObjectExpression(p.node.right)) {
                    cache[p.node.left.name] = p.node.right;
                }
            }
            // export default xx
            if (t.isExportDefaultDeclaration(p.node)) {
                if (t.isObjectExpression(p.node.declaration)) {
                    // export default { xxx }
                    properties = getKeyList(p.node.declaration);
                }
                else if (t.isIdentifier(p.node.declaration)) {
                    // const abc = { };
                    // export default abc
                    const name = p.node.declaration.name;
                    if (cache[name]) {
                        properties = getKeyList(cache[name]);
                    }
                }
            }
        },
    });
    return properties;
}
function getKeyList(node) {
    const keyList = node.properties
        .map(item => {
        if (t.isObjectMember(item) && t.isIdentifier(item.key)) {
            return item.key.name;
        }
    })
        .filter(item => !!item);
    return keyList;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2dlbmVyYXRvcnMvZXh0ZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQXNDO0FBQ3RDLGlDQUFpQztBQUNqQyxtQ0FBbUM7QUFDbkMseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3Qiw2QkFBNkI7QUFHN0IsbUJBQXdCLFFBQWtCO0lBQ3hDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFFO1FBQ2pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQ3pCLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQzFDLENBQUM7UUFFRixJQUFJLFFBQWtCLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqQixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFM0Qsc0NBQXNDO1lBQ3RDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUN4QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDakQsQ0FBQztRQUNKLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM5RCxD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