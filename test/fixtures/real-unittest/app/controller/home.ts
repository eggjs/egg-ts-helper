import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index() {
    const { ctx, app } = this;
    app.customLog();
    ctx.body = 'ok';
  }
}
