import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-key.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { CustomerService } from './customer.service';

const data = {
  name: 'Acme', taxId: '', country: 'IN', regionCode: '27', email: '', phone: '', address: '',
};

describe('CustomerService', () => {
  let service: CustomerService;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(() => {
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
    service = TestBed.inject(CustomerService);
  });

  it('adds with a generated id and persists', async () => {
    const customer = await service.add(data);
    expect(customer.id).toMatch(/^cust_/);
    expect(service.customers()).toEqual([customer]);
    expect(JSON.parse(mocks.preferences.store.get(StorageKey.Customers)!)).toHaveLength(1);
  });

  it('finds, updates and removes', async () => {
    const customer = await service.add(data);
    await service.update({ ...customer, name: 'Renamed' });
    expect(service.byId(customer.id)?.name).toBe('Renamed');
    await service.remove(customer.id);
    expect(service.byId(customer.id)).toBeUndefined();
    expect(service.customers()).toEqual([]);
  });

  it('loads and migrates old records', async () => {
    mocks.preferences.store.set(
      StorageKey.Customers,
      JSON.stringify([{ id: 'c1', name: 'Old', gstin: 'G', stateCode: '29' }, { name: 'no id' }]),
    );
    await service.load();
    expect(service.customers()).toHaveLength(1);
    expect(service.customers()[0]).toMatchObject({ taxId: 'G', regionCode: '29' });
  });

  it('replaces everything', async () => {
    await service.add(data);
    await service.replaceAll([]);
    expect(service.customers()).toEqual([]);
  });
});
