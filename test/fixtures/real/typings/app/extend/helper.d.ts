// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import ExtendIHelper from '../../../app/extend/helper';
declare module 'egg' {
  type ExtendIHelperType = typeof ExtendIHelper;
  interface IHelper extends ExtendIHelperType { }
}