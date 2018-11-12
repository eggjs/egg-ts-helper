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
    },
    casestyle: {
      path: 'app/casestyle',
      pattern: '**/*.schema.(ts|js)',
      caseStyle: filename => {
        const p1 = filename.split('.schema')[0];
        return [ p1.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase()) ];
      }
    }
  }
};
