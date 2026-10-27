import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNativeMocks } from '../testing/native-mocks';
import { initializeApp } from './app-initializer';
import { BusinessService } from './services/business/business.service';
import { CustomerService } from './services/customer/customer.service';
import { InvoiceService } from './services/invoice/invoice.service';
import { SetupService } from './services/setup/setup.service';

describe('initializeApp', () => {
  it('flags a brand-new install for first-run setup and seeds nothing', async () => {
    TestBed.configureTestingModule({
      providers: [...provideNativeMocks().providers, { provide: Router, useValue: { navigateByUrl: vi.fn() } }],
    });
    await TestBed.runInInjectionContext(() => initializeApp());
    expect(TestBed.inject(SetupService).needed()).toBe(true);
    expect(TestBed.inject(BusinessService).business().name).toBe('');
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
    expect(TestBed.inject(InvoiceService).invoices()).toEqual([]);
  });

  it('keeps existing data on a returning install', async () => {
    const mocks = provideNativeMocks();
    mocks.preferences.store.set('gstdesk.business', JSON.stringify({ name: 'Mine' }));
    TestBed.configureTestingModule({
      providers: [...mocks.providers, { provide: Router, useValue: { navigateByUrl: vi.fn() } }],
    });
    await TestBed.runInInjectionContext(() => initializeApp());
    expect(TestBed.inject(BusinessService).business().name).toBe('Mine');
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
    expect(TestBed.inject(SetupService).needed()).toBe(false);
  });
});
