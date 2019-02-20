import fs from 'fs';
import mkdirp from 'mkdirp';
import glob from 'globby';
import path from 'path';
import ts from 'typescript';
import yn from 'yn';
import { execSync } from 'child_process';

export const JS_CONFIG = {
  include: [ '**/*' ],
};

export const TS_CONFIG = {
  compilerOptions: {
    target: 'es2017',
    module: 'commonjs',
    strict: true,
    noImplicitAny: false,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
    charset: 'utf8',
    allowJs: false,
    pretty: true,
    lib: [ 'es6' ],
    noEmitOnError: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    strictPropertyInitialization: false,
    noFallthroughCasesInSwitch: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    inlineSourceMap: true,
  },
};

// convert string to same type with default value
export function convertString<T>(val: string | undefined, defaultVal: T): T {
  if (val === undefined) return defaultVal;
  switch (typeof defaultVal) {
    case 'boolean':
      return yn(val, { default: defaultVal }) as any;
    case 'number':
      const num = +val;
      return (isNaN(num) ? defaultVal : num) as any;
    case 'string':
      return val as any;
    default:
      return defaultVal;
  }
}

// get framework plugin list
interface FindPluginResult {
  pluginList: string[];
  pluginInfos: PlainObject<{ package: string; path: string; enable: boolean; }>;
}

const pluginCache: PlainObject<FindPluginResult> = {};
export function getFrameworkPlugins(cwd: string): FindPluginResult {
  if (pluginCache[cwd]) {
    return pluginCache[cwd];
  }

  let pluginInfos = {};
  try {
    // executing scripts to get eggInfo
    const info = execSync(`node ./scripts/plugin ${cwd}`, {
      cwd: __dirname,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        EGG_TYPESCRIPT: 'false',
      },
    });
    pluginInfos = JSON.parse(info.toString());
  } catch (e) {
    return { pluginList: [], pluginInfos };
  }

  const pluginList: string[] = [];
  Object.keys(pluginInfos).forEach(name => {
    const pluginInfo = pluginInfos[name];
    if (pluginInfo.enable) {
      pluginList.push(pluginInfo.package);
    }
  });

  return pluginCache[cwd] = {
    pluginList,
    pluginInfos,
  };
}

export function isIdentifierName(s: string) {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(s);
}

// load ts/js files
export function loadFiles(cwd: string, pattern?: string) {
  const fileList = glob.sync([ pattern || '**/*.(js|ts)', '!**/*.d.ts' ], {
    cwd,
  });

  return fileList.filter(f => {
    // filter same name js/ts
    return !(
      f.endsWith('.js') &&
      fileList.includes(f.substring(0, f.length - 2) + 'ts')
    );
  });
}

// write jsconfig.json to cwd
export function writeJsConfig(cwd: string) {
  const jsconfigUrl = path.resolve(cwd, './jsconfig.json');
  if (!fs.existsSync(jsconfigUrl)) {
    fs.writeFileSync(jsconfigUrl, JSON.stringify(JS_CONFIG, null, 2));
    return jsconfigUrl;
  }
}

// write tsconfig.json to cwd
export function writeTsConfig(cwd: string) {
  const tsconfigUrl = path.resolve(cwd, './tsconfig.json');
  if (!fs.existsSync(tsconfigUrl)) {
    fs.writeFileSync(tsconfigUrl, JSON.stringify(TS_CONFIG, null, 2));
    return tsconfigUrl;
  }
}

export function checkMaybeIsJsProj(cwd: string) {
  const pkgInfo = getPkgInfo(cwd);
  const isJs = !(pkgInfo.egg && pkgInfo.egg.typescript) &&
    !fs.existsSync(path.resolve(cwd, './tsconfig.json')) &&
    !fs.existsSync(path.resolve(cwd, './config/config.default.ts')) &&
    (
      fs.existsSync(path.resolve(cwd, './config/config.default.js')) ||
      fs.existsSync(path.resolve(cwd, './jsconfig.json'))
    );

  return isJs;
}

// load modules to object
export function loadModules<T = any>(cwd: string, loadDefault?: boolean) {
  const modules: { [key: string]: T } = {};
  fs
    .readdirSync(cwd)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const name = f.substring(0, f.lastIndexOf('.'));
      const obj = require(path.resolve(cwd, name));
      if (loadDefault && obj.default) {
        modules[name] = obj.default;
      } else {
        modules[name] = obj;
      }
    });
  return modules;
}

// convert string to function
export function strToFn(fn) {
  if (typeof fn === 'string') {
    return (...args: any[]) => fn.replace(/{{\s*(\d+)\s*}}/g, (_, index) => args[index]);
  } else {
    return fn;
  }
}

// log
export function log(msg: string, prefix: boolean = true) {
  console.info(`${prefix ? '[egg-ts-helper] ' : ''}${msg}`);
}

export function getAbsoluteUrlByCwd(p: string, cwd: string) {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}

// get import context
export function getImportStr(
  from: string,
  to: string,
  moduleName?: string,
  importStar?: boolean,
) {
  const extname = path.extname(to);
  let importPath = path.relative(from, to).replace(/\/|\\/g, '/');
  importPath = importPath.substring(0, importPath.length - extname.length);
  const isTS = extname === '.ts';
  const importStartStr = isTS && importStar ? '* as ' : '';
  const fromStr = isTS ? `from '${importPath}'` : `= require('${importPath}')`;
  return `import ${importStartStr}${moduleName} ${fromStr};`;
}

// write file, using fs.writeFileSync to block io that d.ts can create before egg app started.
export function writeFileSync(fileUrl, content) {
  mkdirp.sync(path.dirname(fileUrl));
  fs.writeFileSync(fileUrl, content);
}

// clean same name js/ts
export function cleanJs(cwd: string) {
  const fileList: string[] = [];
  glob
    .sync([ '**/*.ts', '!**/*.d.ts', '!**/node_modules' ], { cwd })
    .forEach(f => {
      const jf = removeSameNameJs(path.resolve(cwd, f));
      if (jf) {
        fileList.push(jf);
      }
    });

  if (fileList.length) {
    console.info('[egg-ts-helper] These file was deleted because the same name ts file was exist!\n');
    console.info('  ' + fileList.join('\n  ') + '\n');
  }
}

// get moduleName by file path
export function getModuleObjByPath(f: string) {
  const props = f.substring(0, f.lastIndexOf('.')).split('/');

  // composing moduleName
  const moduleName = props.map(prop => camelProp(prop, 'upper')).join('');

  return {
    props,
    moduleName,
  };
}

// remove same name js
export function removeSameNameJs(f: string) {
  if (!f.endsWith('.ts') || f.endsWith('.d.ts')) {
    return;
  }

  const jf = f.substring(0, f.length - 2) + 'js';
  if (fs.existsSync(jf)) {
    fs.unlinkSync(jf);
    return jf;
  }
}

// resolve module
export function resolveModule(url) {
  try {
    return require.resolve(url);
  } catch (e) {
    return undefined;
  }
}

// check whether module is exist
export function moduleExist(mod: string, cwd?: string) {
  const nodeModulePath = path.resolve(cwd || process.cwd(), 'node_modules', mod);
  return fs.existsSync(nodeModulePath) || resolveModule(mod);
}

// require modules
export function requireFile(url) {
  url = url && resolveModule(url);
  if (!url) {
    return undefined;
  }

  let exp = require(url);
  if (exp.__esModule && 'default' in exp) {
    exp = exp.default;
  }

  return exp;
}

// require package.json
export function getPkgInfo(cwd: string) {
  return requireFile(path.resolve(cwd, './package.json')) || {};
}

// format property
export function formatProp(prop: string) {
  return prop.replace(/[._-][a-z]/gi, s => s.substring(1).toUpperCase());
}

// like egg-core/file-loader
export function camelProp(
  property: string,
  caseStyle: string | ((...args: any[]) => string),
): string {
  if (typeof caseStyle === 'function') {
    return caseStyle(property);
  }

  // camel transfer
  property = formatProp(property);
  let first = property[ 0 ];
  // istanbul ignore next
  switch (caseStyle) {
    case 'lower':
      first = first.toLowerCase();
      break;
    case 'upper':
      first = first.toUpperCase();
      break;
    case 'camel':
      break;
    default:
      break;
  }

  return first + property.substring(1);
}

/**
 * ts ast utils
 */

// find export node from sourcefile.
export function findExportNode(code: string) {
  const sourceFile = ts.createSourceFile('file.ts', code, ts.ScriptTarget.ES2017, true);
  const result = findExports(sourceFile);
  let exportDefault: ExportObj | undefined;

  if (result.exportEqual) {
    exportDefault = result.exportEqual;
  } else if (result.exportList.has('default')) {
    exportDefault = result.exportList.get('default')!;
    result.exportList.delete('default');
  }

  return {
    exportDefault,
    exportList: result.exportList,
  };
}

// check kind in node.modifiers.
export function modifierHas(node: ts.Node, kind) {
  return node.modifiers && node.modifiers.find(mod => kind === mod.kind);
}

export function formatIdentifierName(name: string) {
  return name.replace(/^("|')|("|')$/g, '');
}

export function getText(node?: ts.Node) {
  if (node) {
    if (ts.isIdentifier(node)) {
      return formatIdentifierName(node.text);
    } else if (ts.isStringLiteral(node)) {
      return node.text;
    } else if (ts.isQualifiedName(node)) {
      return getText(node.right);
    }
  }
  return '';
}

// find assign result type
export interface AssignElement {
  init?: boolean;
  obj?: ts.Expression;
  key: ts.Identifier;
  value?: ts.Expression;
  node: ts.Node;
}

export interface ExportObj {
  node: ts.Node;
  originalNode: ts.Node;
}

// find exports from sourcefile
export function findExports(source: ts.SourceFile) {
  let exportEqual: ExportObj | undefined;
  const exportList: Map<string, ExportObj> = new Map();
  const checker = getAssignChecker([
    'exports',
    'module',
    'module.exports',
  ]);
  const kvList = findKVList(source.statements);
  const getRealValue = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      return kvList.get(getText(node)) || node;
    } else if (ts.isPropertyAccessExpression(node)) {
      return getNodeFromPropertyAccess(node, kvList) || node;
    } else {
      return node;
    }
  };

  const addExportNode = (name: string, value: ts.Node, node: ts.Node) => {
    exportList.set(name, {
      node: getRealValue(value)!,
      originalNode: node,
    });
  };

  source.statements.forEach(statement => {
    const isExport = modifierHas(statement, ts.SyntaxKind.ExportKeyword);
    if (ts.isExportAssignment(statement)) {
      if (statement.isExportEquals) {
        // export = {}
        exportEqual = {
          node: getRealValue(statement.expression),
          originalNode: statement,
        };
      } else {
        // export default {}
        addExportNode('default', statement.expression, statement);
      }

      return;
    } else if (isExport && (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))) {
      if (modifierHas(statement, ts.SyntaxKind.DefaultKeyword)) {
        // export default function() {} | export default class xx {}
        addExportNode('default', statement, statement);
      } else {
        // export function xxx() {} | export class xx {}
        addExportNode(getText(statement.name), statement, statement);
      }

      return;
    } else if (ts.isExportDeclaration(statement) && statement.exportClause) {
      // export { xxxx };
      statement.exportClause.elements.forEach(spec => {
        addExportNode(getText(spec.name), spec.propertyName || spec.name, statement);
      });

      return;
    }

    getAssignResultFromStatement(statement).forEach(result => {
      const newResult = checker.check(result);
      if (isExport) {
        // export const xxx = {};
        addExportNode(getText(result.key), result.value!, result.node);
      }

      if (!newResult) return;
      if (newResult.name === 'exports' || newResult.name === 'module.exports') {
        // exports.xxx = {} | module.exports.xxx = {}
        addExportNode(getText(newResult.key), newResult.value, newResult.node);
      } else if (newResult.name === 'module' && getText(newResult.key) === 'exports') {
        // module.exports = {}
        exportEqual = {
          node: getRealValue(newResult.value!),
          originalNode: newResult.node,
        };
      }
    });
  });

  return {
    exportEqual,
    exportList,
  };
}

export function findAssign(statements: ts.NodeArray<ts.Statement>, cb: (result: AssignElement) => void) {
  statements.forEach(statement => {
    getAssignResultFromStatement(statement).forEach(cb);
  });
}

export function findAssignByName(statements, name: FindAssignNameType | FindAssignNameType[], cb: (result: AssignNameElement) => void) {
  const checker = getAssignChecker(name);
  return findAssign(statements, result => {
    const newResult = checker.check(result);
    if (newResult) cb(newResult);
  });
}

type FindAssignNameType = string | RegExp;
interface AssignNameElement extends AssignElement {
  obj: ts.Expression;
  name: string;
  value: ts.Expression;
}

export function getAssignChecker(name: FindAssignNameType | FindAssignNameType[]) {
  // cache the variable of name
  const variableList = Array.isArray(name) ? name : [ name ];
  const nameAlias = {};
  const getRealName = name => {
    const realName = nameAlias[name] || name;
    const hitTarget = !!variableList.find(variable => {
      return (typeof variable === 'string')
        ? variable === realName
        : variable.test(realName);
    });
    return hitTarget ? realName : undefined;
  };

  return {
    check(el: AssignElement): AssignNameElement | undefined {
      const { obj, key, value, node } = el;
      if (!obj || !value) {
        // const xx = name
        if (value) {
          const realName = getRealName(value.getText().trim());
          if (realName) {
            nameAlias[getText(key)] = realName;
          }
        }

        return;
      }

      const realName = getRealName(obj.getText().trim());
      if (realName) {
        return { name: realName, obj, key, value, node };
      }
    },
  };
}

function splitProperty(node: ts.Node): string[] {
  if (ts.isIdentifier(node)) {
    return [ node.getText() ];
  } else if (ts.isPropertyAccessExpression(node)) {
    return splitProperty(node.expression).concat([ node.name.getText() ]);
  } else {
    return [];
  }
}

function getNodeFromPropertyAccess(obj: ts.Node, kv: Map<string, ts.Node | undefined>) {
  if (ts.isIdentifier(obj)) {
    return kv.get(obj.getText());
  } else if (ts.isPropertyAccessExpression(obj)) {
    const keyList = splitProperty(obj);
    const first = keyList.shift();
    if (!first || !kv.has(first)) {
      return;
    }

    let curr = kv.get(first)!;
    if (!curr || !ts.isObjectLiteralExpression(curr)) {
      return;
    }

    while (keyList.length) {
      const k = keyList.shift();
      const prop = (curr as ts.ObjectLiteralExpression).properties.find(prop => getText(prop.name) === k);
      if (!prop) {
        return;
      }

      if (keyList.length) {
        if (ts.isPropertyAccessExpression(prop)) {
          curr = prop;
        } else {
          return;
        }
      }
    }

    return curr;
  } else {
    return obj;
  }
}

export function findKVList(statements: ts.NodeArray<ts.Statement>) {
  const kv: Map<string, ts.Node | undefined> = new Map();
  statements.forEach(statement => {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      // cache function declaration and class declaration
      return kv.set(getText(statement.name), statement);
    }

    getAssignResultFromStatement(statement).forEach(({ obj, key, value }) => {
      if (!obj) {
        return kv.set(getText(key), value ? getNodeFromPropertyAccess(value, kv) : undefined);
      }

      if (!value) return;

      const o = getNodeFromPropertyAccess(obj, kv);
      if (o && ts.isObjectLiteralExpression(o)) {
        const propertyAssignment = ts.createPropertyAssignment(key, value);
        const index = o.properties.findIndex(p => getText(p.name) === getText(key));
        if (index >= 0) {
          o.properties = ts.createNodeArray(o.properties
            .slice(0, index)
            .concat([ propertyAssignment ])
            .concat(o.properties.slice(index + 1)));
        } else {
          o.properties = ts.createNodeArray(o.properties.concat([ propertyAssignment ]));
        }
        propertyAssignment.parent = o;
      }
    });
  });
  return kv;
}

export function getAssignResultFromStatement(statement: ts.Statement, assignList: AssignElement[] = []) {
  const checkValue = (node?: ts.Expression) => {
    if (node && ts.isBinaryExpression(node)) {
      checkBinary(node);
      return checkValue(node.right);
    } else {
      return node;
    }
  };

  // check binary expression
  const checkBinary = (node: ts.BinaryExpression) => {
    if (
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.name)
    ) {
      // xxx.xxx = xx
      assignList.push({
        obj: node.left.expression,
        key: node.left.name,
        value: checkValue(node.right),
        node: statement,
      });
    } else if (ts.isIdentifier(node.left)) {
      // xxx = xx
      assignList.push({
        key: node.left,
        value: checkValue(node.right),
        node: statement,
      });
    } else if (
      ts.isElementAccessExpression(node.left) &&
      ts.isStringLiteral(node.left.argumentExpression)
    ) {
      // xxx['sss'] = xxx
      assignList.push({
        obj: node.left.expression,
        key: ts.createIdentifier(node.left.argumentExpression.text),
        value: checkValue(node.right),
        node: statement,
      });
    }
  };

  const eachStatement = (statements: ts.NodeArray<ts.Statement>) => {
    statements.forEach(statement => getAssignResultFromStatement(statement, assignList));
  };

  const checkIfStatement = (el: ts.IfStatement) => {
    if (ts.isBlock(el.thenStatement)) {
      eachStatement(el.thenStatement.statements);
    }

    if (el.elseStatement) {
      if (ts.isIfStatement(el.elseStatement)) {
        checkIfStatement(el.elseStatement);
      } else if (ts.isBlock(el.elseStatement)) {
        eachStatement(el.elseStatement.statements);
      }
    }
  };

  if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
    // xxx = xxx
    checkBinary(statement.expression);
  } else if (ts.isVariableStatement(statement)) {
    // const xxx = xx
    statement.declarationList.declarations.forEach(declare => {
      if (ts.isIdentifier(declare.name)) {
        assignList.push({
          init: true,
          key: declare.name,
          value: checkValue(declare.initializer),
          node: declare,
        });
      }
    });
  } else if (ts.isIfStatement(statement)) {
    // if () { xxx = xxx }
    checkIfStatement(statement);
  }

  return assignList;
}
