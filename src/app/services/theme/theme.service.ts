import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Style } from '@capacitor/status-bar';
import { STATUS_BAR } from '../../tokens/native-plugins.tokens';
import { StorageKey } from '../../enums/storage-key.enum';
import { ThemeMode } from '../../enums/theme-mode.enum';
import { StorageService } from '../storage/storage.service';

const DARK_CLASS = 'ion-palette-dark';
const MODES = Object.values(ThemeMode) as string[];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);
  private readonly statusBar = inject(STATUS_BAR);

  private readonly _mode = signal<ThemeMode>(ThemeMode.System);
  private readonly _systemDark = signal(false);

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(
    () => this._mode() === ThemeMode.Dark || (this._mode() === ThemeMode.System && this._systemDark()),
  );

  private watching = false;

  async load(): Promise<void> {
    const stored = await this.storage.get<string>(StorageKey.Theme, ThemeMode.System);
    this._mode.set(MODES.includes(stored) ? (stored as ThemeMode) : ThemeMode.System);
    this.watchSystem();
    this.apply();
  }

  async setMode(mode: ThemeMode): Promise<void> {
    this._mode.set(mode);
    this.apply();
    await this.storage.set(StorageKey.Theme, mode);
  }

  private watchSystem(): void {
    const view = this.document.defaultView;
    if (this.watching || !view?.matchMedia) return;
    this.watching = true;
    const query = view.matchMedia('(prefers-color-scheme: dark)');
    this._systemDark.set(query.matches);
    query.addEventListener('change', (event) => {
      this._systemDark.set(event.matches);
      this.apply();
    });
  }

  private apply(): void {
    this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark());
    // Light icons on a dark app, dark icons on a light one. A browser has no status bar, so a failure is fine.
    try {
      void Promise.resolve(this.statusBar.setStyle({ style: this.isDark() ? Style.Dark : Style.Light })).catch(() => undefined);
    } catch {
      // plugin not available
    }
  }
}
