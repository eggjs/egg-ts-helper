/**
 * @param {import('egg').Application} app
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home);
}