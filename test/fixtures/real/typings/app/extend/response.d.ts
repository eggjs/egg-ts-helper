// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import ExtendResponse from '../../../app/extend/response';
declare module 'egg' {
  type ExtendResponseType = typeof ExtendResponse;
  interface Response extends ExtendResponseType { }
}