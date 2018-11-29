// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportDb from '../../../app/service/db';

declare module 'egg' {
  interface IService {
    db: ExportDb;
  }
}
