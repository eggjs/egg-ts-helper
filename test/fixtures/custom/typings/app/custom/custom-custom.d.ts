// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportTest from '../../../app/custom/test';
import ExportTest2 from '../../../app/custom/test2';

declare module 'egg' {
  interface Context {
    custom: T_custom_custom;
  }

  interface T_custom_custom {
    test: AutoInstanceType<typeof ExportTest>;
    test2: AutoInstanceType<typeof ExportTest2>;
  }
}
