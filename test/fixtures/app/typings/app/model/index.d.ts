// This file was auto created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import Person from '../../../app/model/Person';
import User from '../../../app/model/User';

declare module 'sequelize' {
  interface Sequelize {
    Person: ReturnType<typeof Person>;
    User: ReturnType<typeof User>;
  }
}
