// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import _Db from '../../../app/service/db';

declare module 'egg' {
  interface IService {
    db: _Db;
  }
}
