import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.jifi_bystander',
  appName: 'JIFI Bystander',
  webDir: 'www',
  android: {
    allowMixedContent: true
  }
};

export default config;
