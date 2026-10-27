import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageKey } from '../../enums/storage-key.enum';
import { Business } from '../../interfaces/business.interface';
import { defaultBusiness, switchCountry } from '../../utils/business.util';
import { migrateBusiness } from '../../utils/migrate.util';
import { getRegime, withCustomTaxName } from '../../utils/tax-regimes';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly storage = inject(StorageService);

  private readonly _business = signal<Business>(defaultBusiness());
  readonly business = this._business.asReadonly();

  /** The seller's tax regime, with the user's own tax name for the CUSTOM regime. */
  readonly regime = computed(() =>
    withCustomTaxName(getRegime(this._business().country), this._business().customTaxName),
  );

  async load(): Promise<void> {
    const raw = await this.storage.get<unknown>(StorageKey.Business, null);
    this._business.set(raw ? migrateBusiness(raw) : defaultBusiness());
  }

  async update(changes: Partial<Business>): Promise<void> {
    await this.replace({ ...this._business(), ...changes });
  }

  async replace(business: Business): Promise<void> {
    this._business.set(business);
    await this.storage.set(StorageKey.Business, business);
  }

  /** Changing the country resets currency, region, default rate, tax ID and bank codes. */
  async setCountry(regimeCode: string): Promise<void> {
    await this.replace(switchCountry(this._business(), regimeCode));
  }
}
