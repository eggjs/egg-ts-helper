// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'larva'; // Make sure ts to import larva declaration at first
import { EggAppConfig } from 'larva';
import ExportConfigDefault from '../../config/config.default';
import ExportConfigLocal from '../../config/config.local';
import * as ExportConfigProd from '../../config/config.prod';
type ConfigDefault = ReturnType<typeof ExportConfigDefault>;
type ConfigLocal = typeof ExportConfigLocal;
type ConfigProd = typeof ExportConfigProd;
type NewEggAppConfig = EggAppConfig & ConfigDefault & ConfigLocal & ConfigProd;

declare module 'larva' {
  interface Application {
    config: NewEggAppConfig;
  }

  interface Controller {
    config: NewEggAppConfig;
  }

  interface Service {
    config: NewEggAppConfig;
  }
}