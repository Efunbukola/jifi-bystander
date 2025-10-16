import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.jiband',
  appName: 'JIBAND APP',
  webDir: 'www',
  android: {
    allowMixedContent: true
  }
};

export default config;
