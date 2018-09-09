// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'larva'; // Make sure ts to import larva declaration at first
import Person from '../../../app/model/Person';
import User from '../../../app/model/User';

declare module 'larva' {
  interface IModel {
    Person: ReturnType<typeof Person>;
    User: ReturnType<typeof User>;
  }
}
