import path from 'path';

export const eggInfoTmp = path.resolve(__dirname, './.tmp.json');

export const dtsComment =
  '// This file is created by egg-ts-helper\n' +
  '// Do not modify this file!!!!!!!!!\n';

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
