import { Application } from 'egg';

export default (app: Application) => {
  app.loader.loadToApp('app/custom6', 'custom6', {
    caseStyle: 'upper',
  });

  app.loader.loadToContext('app/custom7', 'custom7', {
    caseStyle: 'lower',
  });
};
