// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportUser from '../../../app/model/User';

declare module 'egg' {
  interface Application {
    model: IModel;
  }

  interface IModel {
    User: ReturnType<typeof ExportUser>;
  }
}
