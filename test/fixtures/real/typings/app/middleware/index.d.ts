// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg'; // Make sure ts to import egg declaration at first
import Access from '../../../app/middleware/access';

declare module 'egg' {
  interface IMiddleware {
    access: typeof Access;
  }
}
