// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import ExtendApplication from '../../../app/extend/application';
declare module 'egg' {
  type ExtendApplicationType = typeof ExtendApplication;
  interface Application extends ExtendApplicationType { }
}