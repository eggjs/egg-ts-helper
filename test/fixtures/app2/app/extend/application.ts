const exportApp = {
  get go(this: any) {
    this.fucker = 'go';
    return this.fucker;
  },

  set go(val) {
    this._go = val;
  },

  isCool() {
    const val = '123';
    console.info(val + 'is Cool');
  },

  'test-gg': () => {
    console.info('ko');
  },

  ['test-ggs']: () => {
    console.info('ko');
  },

  isNotCool() {
    console.info('is not Cool');
  },
};

let secondExportApp: any;
secondExportApp = exportApp;

export function abc() {
  console.info('sss');
}

export default secondExportApp;
