import path from 'path';
import packInfo from '../package.json';

export const tmpDir = path.resolve(__dirname, '../.tmp');
export const eggInfoPath = path.resolve(tmpDir, './eggInfo.json');
export const dtsCommentRE = new RegExp(`^\\/\\/ [\\w ]+ ${packInfo.name}(@\\d+\\.\\d+\\.\\d+)?`);
export const dtsComment =
  `// This file is created by ${packInfo.name}@${packInfo.version}\n` +
  '// Do not modify this file!!!!!!!!!\n' +
  '/* eslint-disable */\n';

// mapping declaration in egg
export const declMapping = {
  service: 'IService',
  controller: 'IController',
  ctx: 'Context',
  context: 'Context',
  app: 'Application',
  application: 'Application',
  agent: 'Agent',
  request: 'Request',
  response: 'Response',
  helper: 'IHelper',
  middleware: 'IMiddleware',
  config: 'EggAppConfig',
  plugin: 'EggPlugin',
};
