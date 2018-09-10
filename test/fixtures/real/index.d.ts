import { PlainObject } from 'egg';

declare module 'egg' {
  export interface IModel extends PlainObject { };

  interface Application {
    model: IModel;
  }
}