// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExtendRequest from '../../../app/extend/request';
declare module 'egg' {
  type ExtendRequestType = typeof ExtendRequest;
  interface Request extends ExtendRequestType { }
}