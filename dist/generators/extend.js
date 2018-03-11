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
            let tsPath = path.relative(dtsDir, f);
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