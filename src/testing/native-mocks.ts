import { Provider } from '@angular/core';
import {
  APP_PLUGIN,
  FILESYSTEM,
  HAPTICS,
  IS_NATIVE,
  KEYBOARD,
  PREFERENCES,
  PRINTER,
  SHARE,
  STATUS_BAR,
} from '../app/tokens/native-plugins.tokens';

/** In-memory stand-in for @capacitor/preferences. */
export function createMemoryPreferences() {
  const store = new Map<string, string>();
  return {
    store,
    get: async ({ key }: { key: string }) => ({ value: store.has(key) ? store.get(key)! : null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    keys: async () => ({ keys: [...store.keys()] }),
  };
}

export type MemoryPreferences = ReturnType<typeof createMemoryPreferences>;

export interface AppMock {
  listeners: Map<string, (event: unknown) => void>;
  addListener: (name: string, fn: (event: unknown) => void) => Promise<{ remove: () => Promise<void> }>;
}

export function createAppMock(): AppMock {
  const listeners = new Map<string, (event: unknown) => void>();
  return {
    listeners,
    addListener: async (name, fn) => {
      listeners.set(name, fn);
      return { remove: async () => void listeners.delete(name) };
    },
  };
}

export interface NativeMocks {
  preferences: MemoryPreferences;
  app: AppMock;
  providers: Provider[];
}

export function provideNativeMocks(preferences = createMemoryPreferences()): NativeMocks {
  const app = createAppMock();
  const noop = async () => undefined;
  return {
    preferences,
    app,
    providers: [
      { provide: PREFERENCES, useValue: preferences },
      { provide: APP_PLUGIN, useValue: app },
      { provide: HAPTICS, useValue: { impact: noop, notification: noop, vibrate: noop } },
      { provide: STATUS_BAR, useValue: { setStyle: noop, setBackgroundColor: noop } },
      { provide: KEYBOARD, useValue: { hide: noop, show: noop } },
      { provide: IS_NATIVE, useValue: false },
      { provide: FILESYSTEM, useValue: { writeFile: async () => ({ uri: 'file:///cache/backup.json' }) } },
      { provide: SHARE, useValue: { share: noop } },
      { provide: PRINTER, useValue: { printHtml: noop } },
    ],
  };
}
