// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import Uuid from '../../../app/middleware/uuid';

declare module 'larva' {
  interface IMiddleware {
    uuid: ReturnType<typeof Uuid>;
  }
}
