import { EggAppConfig, PowerPartial } from 'egg';

export default function() {
  // built-in config
  const config: PowerPartial<EggAppConfig> = {};

  config.keys = '123123';

  // biz config
  const bizConfig = {
    biz: {
      type: 'biz',
    },
  };

  return {
    ...config,
    ...bizConfig,
  };
}
