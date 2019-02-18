// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import 'egg-test';
import { EggPluginItem } from 'egg';
declare module 'egg' {
  interface EggPlugin {
    test?: EggPluginItem;
  }
}