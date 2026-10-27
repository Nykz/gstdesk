import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-key.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from './business.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(() => {
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
    service = TestBed.inject(BusinessService);
  });

  it('starts with an Indian default business', () => {
    expect(service.business().country).toBe('IN');
    expect(service.regime().taxName).toBe('GST');
  });

  it('loads and migrates a stored business with old names', async () => {
    mocks.preferences.store.set(StorageKey.Business, JSON.stringify({ name: 'Old', gstin: '27X', ifsc: 'IF' }));
    await service.load();
    expect(service.business()).toMatchObject({ name: 'Old', taxId: '27X', bankCode: 'IF' });
  });

  it('persists updates', async () => {
    await service.update({ name: 'Acme' });
    expect(service.business().name).toBe('Acme');
    expect(JSON.parse(mocks.preferences.store.get(StorageKey.Business)!).name).toBe('Acme');
  });

  it('changing the country resets the country-bound fields and the regime follows', async () => {
    await service.update({ name: 'Acme', taxId: 'X', bankCode: 'IFSC1', paymentId: 'u@p' });
    await service.setCountry('GB');
    expect(service.business()).toMatchObject({
      name: 'Acme',
      country: 'GB',
      currency: 'GBP',
      taxId: '',
      bankCode: '',
      paymentId: '',
      defaultTaxRate: 20,
    });
    expect(service.regime().taxName).toBe('VAT');
  });

  it('CUSTOM regime takes the custom tax name', async () => {
    await service.setCountry('CUSTOM');
    await service.update({ customTaxName: 'Levy' });
    expect(service.regime().taxName).toBe('Levy');
  });
});
