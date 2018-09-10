// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import ExtendRequest from '../../../app/extend/request';
declare module 'egg' {
  type ExtendRequestType = typeof ExtendRequest;
  interface Request extends ExtendRequestType { }
}