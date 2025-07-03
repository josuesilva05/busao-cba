import type { CapacitorConfig } from '@capacitor/cli';

// Permitir conexões HTTP não seguras
// Isso é necessário para desenvolvimento, mas deve ser evitado em produção

const config: CapacitorConfig = {
  appId: 'com.josu.busaocba',
  appName: 'Busão CBA',
  webDir: 'www',
  server: {
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
