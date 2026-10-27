import { InjectionToken } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Haptics } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { StatusBar } from '@capacitor/status-bar';
import { Printer } from '@capgo/capacitor-printer';

export const PREFERENCES = new InjectionToken<typeof Preferences>('PREFERENCES', {
  providedIn: 'root',
  factory: () => Preferences,
});

export const APP_PLUGIN = new InjectionToken<typeof App>('APP_PLUGIN', {
  providedIn: 'root',
  factory: () => App,
});

export const HAPTICS = new InjectionToken<typeof Haptics>('HAPTICS', {
  providedIn: 'root',
  factory: () => Haptics,
});

export const STATUS_BAR = new InjectionToken<typeof StatusBar>('STATUS_BAR', {
  providedIn: 'root',
  factory: () => StatusBar,
});

export const KEYBOARD = new InjectionToken<typeof Keyboard>('KEYBOARD', {
  providedIn: 'root',
  factory: () => Keyboard,
});

/** True inside the Android / iOS app, false in a browser. */
export const IS_NATIVE = new InjectionToken<boolean>('IS_NATIVE', {
  providedIn: 'root',
  factory: () => Capacitor.isNativePlatform(),
});

export const FILESYSTEM = new InjectionToken<typeof Filesystem>('FILESYSTEM', {
  providedIn: 'root',
  factory: () => Filesystem,
});

export const SHARE = new InjectionToken<typeof Share>('SHARE', {
  providedIn: 'root',
  factory: () => Share,
});

export const PRINTER = new InjectionToken<typeof Printer>('PRINTER', {
  providedIn: 'root',
  factory: () => Printer,
});
