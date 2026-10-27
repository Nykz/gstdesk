import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-key.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { InvoiceService } from '../invoice/invoice.service';
import { DemoDataService } from './demo-data.service';

describe('DemoDataService', () => {
  let service: DemoDataService;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(() => {
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
    service = TestBed.inject(DemoDataService);
  });

  it('start fresh clears everything and does not reseed', async () => {
    await service.loadDemo('2026-10-27');
    await service.startFresh();
    expect(TestBed.inject(BusinessService).business().name).toBe('');
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
    expect(TestBed.inject(InvoiceService).invoices()).toEqual([]);
    expect(mocks.preferences.store.has(StorageKey.Seeded)).toBe(true);
  });
});
