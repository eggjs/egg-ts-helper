export default function(app: Egg.Application) {
  const { router, controller } = app;

  console.info(app.custom.test.abc);
  router.get('/', controller.home.index);
}
