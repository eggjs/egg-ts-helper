// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import User from '../../../app/model/User';

declare module 'egg' {
  interface IModel {
    User: ReturnType<typeof User>;
  }
}
