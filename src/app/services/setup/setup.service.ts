import { Injectable, inject, signal } from '@angular/core';
import { StorageKey } from '../../enums/storage-key.enum';
import { defaultBusiness } from '../../utils/business.util';
import { BusinessService } from '../business/business.service';
import { DemoDataService } from '../demo-data/demo-data.service';
import { StorageService } from '../storage/storage.service';

export interface FirstRunChoice {
  name: string;
  /** Tax regime code, e.g. IN, US, GB. */
  country: string;
  /** Home currency: dashboard totals and exchange rates are expressed in it. */
  currency: string;
}

/**
 * First launch: the business starts empty and the owner picks their own country and currency, so a US
 * business is never shown rupees. Sample data is offered, never forced.
 */
@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly storage = inject(StorageService);
  private readonly businessService = inject(BusinessService);
  private readonly demoData = inject(DemoDataService);

  private readonly _needed = signal(false);
  /** True until the owner has finished the first-run setup. */
  readonly needed = this._needed.asReadonly();

  /** Flags a brand-new install. Data that already exists (an update, an import) means setup is done. */
  async check(): Promise<void> {
    if (await this.storage.has(StorageKey.Seeded)) return;
    const hasData = await Promise.all(
      [StorageKey.Business, StorageKey.Customers, StorageKey.Invoices].map((key) => this.storage.has(key)),
    );
    if (hasData.some(Boolean)) {
      await this.storage.set(StorageKey.Seeded, true);
      return;
    }
    this._needed.set(true);
  }

  async complete(choice: FirstRunChoice): Promise<void> {
    const business = { ...defaultBusiness(choice.country), name: choice.name.trim(), currency: choice.currency };
    await this.businessService.replace(business);
    await this.storage.set(StorageKey.Seeded, true);
    this._needed.set(false);
  }

  async useSampleData(): Promise<void> {
    await this.demoData.loadDemo();
    this._needed.set(false);
  }
}
