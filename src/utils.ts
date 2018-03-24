import * as fs from 'fs';
import * as glob from 'globby';

// load ts/js files
export function loadFiles(cwd) {
  const fileList = glob.sync(['**/*.(js|ts)', '!**/*.d.ts'], {
    cwd,
  });

  return fileList.filter(f => {
    // filter same name js/ts
    return !(
      f.endsWith('.js') &&
      fileList.includes(f.substring(0, f.length - 2) + 'ts')
    );
  });
}

// require modules
export function requireFile(url) {
  if (!fs.existsSync(url)) {
    return undefined;
  }

  let exp = require(url);
  if (exp.__esModule && 'default' in exp) {
    exp = exp.default;
  }

  if (typeof exp === 'function') {
    exp = exp();
  }

  return exp;
}
