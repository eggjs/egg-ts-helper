export const view = '123';

export default appInfo => {
  const config: any = {};

  // should change to your own
  config.keys = appInfo.name + '_1513135333623_4128';

  config.middleware = [
    'uuid',
  ];

  return config;
};
