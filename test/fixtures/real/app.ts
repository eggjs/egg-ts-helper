import { Application } from 'egg';
import * as path from 'path';

export default (app: Application) => {
  let directory = path.resolve(app.baseDir, './app/model');
  app.loader.loadToApp(directory, 'model', {
    caseStyle: 'upper',
    directory,
  });

  directory = path.resolve(app.baseDir, './app/custom');
  app.loader.loadToApp(directory, 'custom', {
    caseStyle: 'lower',
    directory,
  });
};
