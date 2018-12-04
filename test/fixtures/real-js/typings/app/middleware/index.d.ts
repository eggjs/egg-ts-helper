// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportAccess = require('../../../app/middleware/access');

declare module 'egg' {
  interface IMiddleware {
    access: typeof ExportAccess;
  }
}
