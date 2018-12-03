// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportTest from '../../../app/service/test';

declare module 'egg' {
  interface IService {
    test: ExportTest;
  }
}
