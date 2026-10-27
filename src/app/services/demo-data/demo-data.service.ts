import { Injectable, inject } from '@angular/core';
import { StorageKey } from '../../enums/storage-key.enum';
import { defaultBusiness } from '../../utils/business.util';
import { todayIso } from '../../utils/date.util';
import { buildDemoData } from '../../utils/seed.util';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { InvoiceService } from '../invoice/invoice.service';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  private readonly storage = inject(StorageService);
  private readonly businessService = inject(BusinessService);
  private readonly customerService = inject(CustomerService);
  private readonly invoiceService = inject(InvoiceService);

  async loadDemo(today = todayIso()): Promise<void> {
    const demo = buildDemoData(today);
    await this.businessService.replace(demo.business);
    await this.customerService.replaceAll(demo.customers);
    await this.invoiceService.replaceAll(demo.invoices);
    await this.storage.set(StorageKey.Seeded, true);
  }

  /** Clears customers and invoices and resets the business. Demo data is not reseeded afterwards. */
  async startFresh(): Promise<void> {
    await this.businessService.replace(defaultBusiness());
    await this.customerService.replaceAll([]);
    await this.invoiceService.replaceAll([]);
    await this.storage.set(StorageKey.Seeded, true);
  }
}
