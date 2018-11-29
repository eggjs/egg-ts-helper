// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExtendContext from '../../../app/extend/context';
declare module 'egg' {
  type ExtendContextType = typeof ExtendContext;
  interface Context extends ExtendContextType { }
}