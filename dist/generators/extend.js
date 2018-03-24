"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const babel_traverse_1 = require("babel-traverse");
const t = require("babel-types");
const babylon = require("babylon");
const d = require("debug");
const fs = require("fs");
const path = require("path");
const utils = require("../utils");
const debug = d('egg-ts-helper#generators_extend');
function default_1(tsHelper) {
    tsHelper.register('extend', (config, baseConfig) => {
        const dtsDir = path.resolve(baseConfig.typings, path.relative(baseConfig.cwd, config.dir));
        const fileList = !config.file
            ? utils.loadFiles(config.dir)
            : config.file.endsWith('.ts') ? [config.file] : [];
        debug('file list : %o', fileList);
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
                return tsList.push({ dist });
            }
            const content = fs.readFileSync(f, {
                encoding: 'utf-8',
            });
            // parse ts
            let ast;
            try {
                ast = babylon.parse(content, {
                    sourceType: 'module',
                    plugins: [
                        'typescript',
                        'exportNamespaceFrom',
                        'exportDefaultFrom',
                        'asyncGenerators',
                        'classProperties',
                    ],
                });
            }
            catch (e) {
                console.error(e);
                return;
            }
            const properties = findReturnProperties(ast);
            debug('find return properties : %o', properties);
            if (!properties || !properties.length) {
                return tsList.push({ dist });
            }
            let tsPath = path.relative(dtsDir, f).replace(/\/|\\/g, '/');
            tsPath = tsPath.substring(0, tsPath.lastIndexOf('.'));
            debug('import extendObject from %s', tsPath);
            tsList.push({
                dist,
                content: `import ExtendObject from '${tsPath}';\n` +
                    `declare module \'${baseConfig.framework}\' {\n` +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2dlbmVyYXRvcnMvZXh0ZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQXNDO0FBQ3RDLGlDQUFpQztBQUNqQyxtQ0FBbUM7QUFDbkMsMkJBQTJCO0FBQzNCLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFFN0Isa0NBQWtDO0FBQ2xDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBRW5ELG1CQUF3QixRQUFrQjtJQUN4QyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsRUFBRTtRQUNqRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUN6QixVQUFVLENBQUMsT0FBTyxFQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUMxQyxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVyRCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNyQixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQXNCLEVBQUUsQ0FBQztRQUNyQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ25CLE1BQU0s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