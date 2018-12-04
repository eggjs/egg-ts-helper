import { Controller } from 'egg';

export default class Home extends Controller {
  async index() {
    console.info('home#index');
  }
}
