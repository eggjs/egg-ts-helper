// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportTest from '../../../app/custom/test';

declare module 'egg' {
  interface Application {
    custom: TC100;
  }

  interface TC100 {
    test: AutoInstanceType<typeof ExportTest>;
  }
}
