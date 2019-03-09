// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportTest from '../../../app/myService/test';

declare module 'egg' {
  interface Application {
    myService: T_custom_myService;
  }

  interface T_custom_myService {
    test: AutoInstanceType<typeof ExportTest>;
  }
}
