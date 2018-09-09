// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'larva'; // Make sure ts to import larva declaration at first
import ExtendObject from '../../../app/extend/context';
declare module 'larva' {
  interface Context {
    ctx: typeof ExtendObject.ctx;
    isProd: typeof ExtendObject.isProd;
    isAjax: typeof ExtendObject.isAjax;
  }
}