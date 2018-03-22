const path = require('path');
module.exports = {
  framework: 'larva',
  watchDirs: {
    custom: {
      path: 'app/custom',
      trigger: ['add', 'unlink'],
      generator() {
        return {
          dist: path.resolve(__dirname, './typings/custom.d.ts'),
          content: 'export const a: string;'
        }
      }
    }
  }
};
