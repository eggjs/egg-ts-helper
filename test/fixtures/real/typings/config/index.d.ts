// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import { EggAppConfig } from 'egg';
import ExportConfigDefault from '../../config/config.default';
import ExportConfigLocal from '../../config/config.local';
import ExportConfigProd from '../../config/config.prod';
type ConfigDefault = ReturnType<typeof ExportConfigDefault>;
type ConfigLocal = ReturnType<typeof ExportConfigLocal>;
type ConfigProd = ReturnType<typeof ExportConfigProd>;
declare module 'egg' {
  type NewEggAppConfig = ConfigDefault & ConfigLocal & ConfigProd;
  interface EggAppConfig extends NewEggAppConfig { }
}