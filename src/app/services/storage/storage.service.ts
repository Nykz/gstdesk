import { Injectable, inject } from '@angular/core';
import { StorageKey } from '../../enums/storage-key.enum';
import { PREFERENCES } from '../../tokens/native-plugins.tokens';

/** Typed JSON storage over Capacitor Preferences. Corrupt values are dropped, never thrown. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly preferences = inject(PREFERENCES);

  async get<T>(key: StorageKey, fallback: T): Promise<T> {
    const { value } = await this.preferences.get({ key });
    if (value === null || value === undefined) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      await this.preferences.remove({ key });
      return fallback;
    }
  }

  async has(key: StorageKey): Promise<boolean> {
    const { value } = await this.preferences.get({ key });
    return value !== null && value !== undefined;
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    await this.preferences.set({ key, value: JSON.stringify(value) });
  }

  async remove(key: StorageKey): Promise<void> {
    await this.preferences.remove({ key });
  }
}
