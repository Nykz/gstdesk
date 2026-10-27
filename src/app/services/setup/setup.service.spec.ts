import { TestBed } from '@angular/core/testing';
import { createMemoryPreferences, provideNativeMocks } from '../../../testing/native-mocks';
import { StorageKey } from '../../enums/storage-key.enum';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { SetupService } from './setup.service';

describe('SetupService', () => {
  const preferences = createMemoryPreferences();
  let service: SetupService;

  beforeEach(() => {
    preferences.store.clear();
    TestBed.configureTestingModule({ providers: provideNativeMocks(preferences).providers });
    service = TestBed.inject(SetupService);
  });

  it('asks a brand-new install to run setup, and seeds nothing', async () => {
    await service.check();
    expect(service.needed()).toBe(true);
    expect(TestBed.inject(BusinessService).business().name).toBe('');
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
  });

  it('does not ask again once setup is done', async () => {
    preferences.store.set(StorageKey.Seeded, 'true');
    await service.check();
    expect(service.needed()).toBe(false);
  });

  it('treats existing data as set up, and remembers it', async () => {
    preferences.store.set(StorageKey.Customers, '[]');
    await service.check();
    expect(service.needed()).toBe(false);
    expect(preferences.store.has(StorageKey.Seeded)).toBe(true);
  });

  it('sets the business up in the chosen country and currency', async () => {
    await service.check();
    await service.complete({ name: '  Brightwave Inc  ', country: 'US', currency: 'USD' });
    const business = TestBed.inject(BusinessService).business();
    expect(business).toMatchObject({ name: 'Brightwave Inc', country: 'US', currency: 'USD' });
    expect(service.needed()).toBe(false);
    expect(preferences.store.has(StorageKey.Seeded)).toBe(true);
  });

  it('lets the owner pick a currency other than the country default', async () => {
    await service.complete({ name: 'Thames Ltd', country: 'GB', currency: 'EUR' });
    expect(TestBed.inject(BusinessService).business()).toMatchObject({ country: 'GB', currency: 'EUR' });
  });

  it('can start with sample data instead', async () => {
    await service.check();
    await service.useSampleData();
    expect(service.needed()).toBe(false);
    expect(TestBed.inject(CustomerService).customers()).toHaveLength(8);
  });
});
