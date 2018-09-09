// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'larva'; // Make sure ts to import larva declaration at first
import ExtendObject from '../../../app/extend/application';
declare module 'larva' {
  interface Application {
    isCool: typeof ExtendObject.isCool;
    isNotCool: typeof ExtendObject.isNotCool;
  }
}