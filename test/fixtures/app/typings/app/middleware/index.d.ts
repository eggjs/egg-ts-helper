// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'larva'; // Make sure ts to import larva declaration at first
import Uuid from '../../../app/middleware/uuid';

declare module 'larva' {
  interface IMiddleware {
    uuid: typeof Uuid;
  }
}
