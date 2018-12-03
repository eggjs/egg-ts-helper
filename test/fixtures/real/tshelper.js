module.exports = {
  oneForAll: true,
  watchDirs: {
    model: {
      path: 'app/model', // dir path
      generator: 'class', // generator name
      interface: 'IModel', // interface name
      declareTo: 'Application.model', // declare to this interface
      interfaceHandle: val => `ReturnType<typeof ${val}>`, // interfaceHandle
    },
  }
};
