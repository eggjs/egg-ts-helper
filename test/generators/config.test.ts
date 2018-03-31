import * as path from 'path';
import { findObjects } from '../../dist/generators/config';

describe.only('generators/config.test.ts', () => {
  it('should works without error', () => {
    findObjects(path.resolve(__dirname, '../fixtures/app/app/config/config.default.ts'));
  });
});
