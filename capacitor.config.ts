import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.gstdesk.app',
  appName: 'GSTDesk',
  webDir: 'www',
  // Shown behind the web view while it loads, so there is no white flash on a dark app.
  backgroundColor: '#101211',
  plugins: {
    StatusBar: { backgroundColor: '#101211' },
  },
};

export default config;
