// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExtendApplication from '../../../app/extend/application';
declare module 'egg' {
  type ExtendApplicationType = typeof ExtendApplication;
  interface Application extends ExtendApplicationType { }
}