import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-key.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(() => {
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
    service = TestBed.inject(StorageService);
  });

  it('round-trips JSON values', async () => {
    await service.set(StorageKey.Customers, [{ id: 'a' }]);
    expect(mocks.preferences.store.get('gstdesk.customers')).toBe('[{"id":"a"}]');
    expect(await service.get(StorageKey.Customers, [])).toEqual([{ id: 'a' }]);
  });

  it('returns the fallback when nothing is stored', async () => {
    expect(await service.get(StorageKey.Theme, 'system')).toBe('system');
    expect(await service.has(StorageKey.Theme)).toBe(false);
  });

  it('drops corrupt values and returns the fallback', async () => {
    mocks.preferences.store.set('gstdesk.invoices', '{not json');
    expect(await service.get(StorageKey.Invoices, [])).toEqual([]);
    expect(mocks.preferences.store.has('gstdesk.invoices')).toBe(false);
  });

  it('reports presence and removes', async () => {
    await service.set(StorageKey.Seeded, true);
    expect(await service.has(StorageKey.Seeded)).toBe(true);
    await service.remove(StorageKey.Seeded);
    expect(await service.has(StorageKey.Seeded)).toBe(false);
  });

  it('prefixes keys with gstdesk.', () => {
    expect(Object.values(StorageKey).every((k) => k.startsWith('gstdesk.'))).toBe(true);
  });
});
