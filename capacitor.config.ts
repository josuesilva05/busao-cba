import type { CapacitorConfig } from '@capacitor/cli';

// Permitir conexões HTTP não seguras
// Isso é necessário para desenvolvimento, mas deve ser evitado em produção

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'ionicdroid',
  webDir: 'www',
  server: {
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
