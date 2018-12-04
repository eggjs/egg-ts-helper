import d from 'debug';
import path from 'path';
import fs from 'fs';
import ts from 'typescript';
import { SourceMapGenerator, SourceNode } from 'source-map';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
let uniqId = 100;
const debug = d('egg-ts-helper#generators_class');

export default function(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
  const dist = path.resolve(config.dtsDir, 'index.d.ts');

  debug('file list : %o', fileList);
  if (!fileList.length) {
    return { dist };
  }

  // using to compose import code
  let importStr = '';
  // using to create interface mapping
  const interfaceMap: PlainObject = {};
  const moduleNameSourceMap = {};

  fileList.forEach(f => {
    const { props, moduleName: sModuleName } = utils.getModuleObjByPath(f);
    const moduleName = `Export${sModuleName}`;
    const abUrl = path.join(config.dir, f);
    const importContext = utils.getImportStr(config.dtsDir, abUrl, moduleName);

    importStr += `${importContext}\n`;

    // create mapping
    let collector = interfaceMap;
    while (props.length) {
      const name = utils.camelProp(
        props.shift() as string,
        config.caseStyle || baseConfig.caseStyle,
      );

      if (!props.length) {
        collector[name] = moduleName;
      } else {
        collector = collector[name] = collector[name] || {};
      }
    }

    const content = fs.readFileSync(abUrl, { encoding: 'utf-8' });
    const node = utils.findExportNode(content);
    if (!node) {
      return;
    }

    moduleNameSourceMap[moduleName] = {
      node: node.exportDefaultNode,
      file: abUrl,
    };
  });

  // interface name
  const interfaceName = config.interface || `TC${uniqId++}`;
  let startLine = importStr.match(/\n/g)!.length + 4;

  // add mount interface
  let declareInterface;
  if (config.declareTo) {
    const interfaceList: string[] = config.declareTo.split('.');
    const interfaceContent = composeInterface(
      interfaceList.slice(1).concat(interfaceName),
      interfaceList[0],
      undefined,
      '  ',
    );
    declareInterface = interfaceContent.content;
    startLine += interfaceContent.line;
  }

  const { sourceMapping, content } = composeInterface(
    interfaceMap,
    interfaceName,
    config.interfaceHandle,
    '  ',
  );

  const declareContent = `declare module '${config.framework || baseConfig.framework}' {\n` +
    (declareInterface ? `${declareInterface}\n` : '') +
    content +
    '}\n';

  const sourceMapGen = new SourceMapGenerator({
    file: path.basename(dist),
  });

  Object.keys(sourceMapping).forEach(name => {
    const result = moduleNameSourceMap[name];
    if (!result || !result.node) {
      return;
    }

    const sourceInfo = sourceMapping[name];
    const exportDefaultNode = result.node as ts.Node;
    const sourceFile = exportDefaultNode.getSourceFile();
    let pos = exportDefaultNode.pos;
    if ((ts.isClassDeclaration(exportDefaultNode) || ts.isClassExpression(exportDefaultNode)) && exportDefaultNode.name) {
      pos = exportDefaultNode.name.pos;
    }
    const original = sourceFile.getLineAndCharacterOfPosition(pos);
    const mapping = {
      name: sourceInfo.name,
      source: path.relative(dist, result.file),
      original: {
        line: original.line + 1,
        column: original.character,
      },
      generated: {
        line: startLine + sourceInfo.line + 1,
        column: sourceInfo.column - 1,
      },
    };

    console.info(mapping);
    sourceMapGen.addMapping(mapping);
  });

  const inlineSourceMap = '//# sourceMappingURL=index.d.ts.map';
  utils.writeFile(path.resolve(config.dtsDir, 'index.d.ts.map'), sourceMapGen.toString());

  return {
    dist,
    content: `${importStr}\n${declareContent}${inlineSourceMap}`,
  };
}

// composing all the interface
function composeInterface(
  obj: PlainObject | string[],
  wrapInterface?: string,
  preHandle?: (v: string) => string,
  indent?: string,
) {
  let prev = '';
  let mid = '';
  let after = '';
  let line = 0;
  const sourceMapping = {};
  indent = indent || '';

  if (wrapInterface) {
    prev = `${indent}interface ${wrapInterface} {\n`;
    after = `${indent}}\n`;
    indent += '  ';
    line += 1;
  }

  // compose array to object
  // ['abc', 'bbc', 'ccc'] => { abc: { bbc: 'ccc' } }
  if (Array.isArray(obj)) {
    let curr: any = obj.pop();
    while (obj.length) {
      curr = { [obj.pop()!]: curr };
    }
    obj = curr;
  }

  Object.keys(obj).forEach(key => {
    const val = obj[key];
    line += 1;

    if (typeof val === 'string') {
      sourceMapping[val] = { line: line + 1, column: indent!.length + 1, name: key };
      mid += `${indent + key}: ${preHandle ? preHandle(val) : val};\n`;
    } else {
      const newVal = composeInterface(val, undefined, preHandle, indent + '  ');
      if (newVal) {
        mid += `${indent + key}: {\n${newVal + indent!}}\n`;
      }
    }
  });

  if (after) {
    line += 1;
  }

  return {
    line,
    sourceMapping,
    content: `${prev}${mid}${after}`,
  };
}
