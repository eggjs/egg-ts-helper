// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportTest from '../../../app/ctxService/test';

declare module 'egg' {
  interface Context {
    ctxService: T_custom_ctxService;
  }

  interface T_custom_ctxService {
    test: AutoInstanceType<typeof ExportTest>;
  }
}
