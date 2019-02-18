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
  const cache: Map<ts.__String, ts.Node> = new Map();
  const exportNodeList: ts.Node[] = [];
  let exportDefaultNode: ts.Node | undefined;

  sourceFile.statements.forEach(node => {
    // each node in root scope
    if (modifierHas(node, ts.SyntaxKind.ExportKeyword)) {
      if (modifierHas(node, ts.SyntaxKind.DefaultKeyword)) {
        // export default
        exportDefaultNode = node;
      } else {
        // export variable
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(declare =>
            exportNodeList.push(declare),
          );
        } else {
          exportNodeList.push(node);
        }
      }
    } else if (ts.isVariableStatement(node)) {
      // cache variable statement
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          cache.set(declaration.name.escapedText, declaration.initializer);
        }
      }
    } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      // cache function declaration and class declaration
      cache.set(node.name.escapedText, node);
    } else if (ts.isExportAssignment(node)) {
      // export default {}
      exportDefaultNode = node.expression;
    } else if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
      if (ts.isPropertyAccessExpression(node.expression.left)) {
        const obj = node.expression.left.expression;
        const prop = node.expression.left.name;
        if (ts.isIdentifier(obj)) {
          if (obj.escapedText === 'exports') {
            // exports.xxx = {}
            exportNodeList.push(node.expression);
          } else if (
            obj.escapedText === 'module' &&
            ts.isIdentifier(prop) &&
            prop.escapedText === 'exports'
          ) {
            // module.exports = {}
            exportDefaultNode = node.expression.right;
          }
        }
      } else if (ts.isIdentifier(node.expression.left)) {
        // let exportData;
        // exportData = {};
        // export exportData
        cache.set(node.expression.left.escapedText, node.expression.right);
      }
    }
  });

  while (exportDefaultNode && ts.isIdentifier(exportDefaultNode) && cache.size) {
    const mid = cache.get(exportDefaultNode.escapedText);
    cache.delete(exportDefaultNode.escapedText);
    exportDefaultNode = mid;
  }

  return {
    exportDefaultNode,
    exportNodeList,
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
