'use strict';

import mm from 'egg-mock';
import { app } from 'egg-mock/bootstrap';

describe('index.test.js', () => {
  beforeEach(() => {
    app.mockCsrf();
  });

  afterEach(() => {
    mm.restore();
  });

  it('should visit / without error', () => {
    return app
      .httpRequest()
      .get('/')
      .expect(200);
  });
});
