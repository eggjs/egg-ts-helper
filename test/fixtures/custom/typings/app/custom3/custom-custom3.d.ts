// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportTest from '../../../app/custom3/test';

declare module 'egg' {
  interface Application {
    custom3: T_custom_custom3;
  }

  interface T_custom_custom3 {
    test: AutoInstanceType<typeof ExportTest>;
  }
}
