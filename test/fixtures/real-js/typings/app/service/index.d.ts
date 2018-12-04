// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportTest = require('../../../app/service/test');

declare module 'egg' {
  interface IService {
    test: ExportTest;
  }
}
