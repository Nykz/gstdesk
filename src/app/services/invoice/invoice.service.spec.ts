import { TestBed } from '@angular/core/testing';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { StorageKey } from '../../enums/storage-key.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from '../business/business.service';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let business: BusinessService;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(() => {
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
    service = TestBed.inject(InvoiceService);
    business = TestBed.inject(BusinessService);
  });

  it('creates a draft that snapshots regime, currency, rate and treatment', async () => {
    await business.update({ regionCode: '29' });
    const draft = service.createDraft('2026-10-27');
    expect(draft).toMatchObject({
      number: 'INV/26-27/001',
      issueDate: '2026-10-27',
      dueDate: '2026-11-11',
      status: InvoiceStatus.Draft,
      regime: 'IN',
      currency: 'INR',
      exchangeRate: 1,
      taxTreatment: TaxTreatment.Standard,
      sellerRegionCode: '29',
    });
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0].taxRate).toBe(18);
  });

  it('a later Settings change does not rewrite saved invoices', async () => {
    const draft = service.createDraft('2026-10-27');
    await service.save(draft);
    await business.setCountry('GB');
    expect(service.byId(draft.id)).toMatchObject({ regime: 'IN', currency: 'INR' });
    expect(service.createDraft('2026-10-27')).toMatchObject({ regime: 'GB', currency: 'GBP' });
  });

  it('numbers continue per fiscal year and restart in the next', async () => {
    await service.save({ ...service.createDraft('2026-10-27'), number: 'INV/26-27/004' });
    expect(service.nextNumber('2026-11-01')).toBe('INV/26-27/005');
    expect(service.nextNumber('2027-04-01')).toBe('INV/27-28/001');
  });

  it('uses the business prefix and a calendar year for January regimes', async () => {
    await business.setCountry('US');
    await business.update({ invoicePrefix: 'ACME' });
    expect(service.nextNumber('2026-10-27')).toBe('ACME/2026/001');
  });

  it('saves (insert then update), persists and removes', async () => {
    const draft = service.createDraft('2026-10-27');
    await service.save(draft);
    await service.save({ ...draft, notes: 'Hello' });
    expect(service.invoices()).toHaveLength(1);
    expect(service.byId(draft.id)?.notes).toBe('Hello');
    expect(JSON.parse(mocks.preferences.store.get(StorageKey.Invoices)!)).toHaveLength(1);
    await service.remove(draft.id);
    expect(service.invoices()).toEqual([]);
  });

  it('marks unpaid invoices paid but never drafts', async () => {
    const draft = service.createDraft('2026-10-27');
    await service.save(draft);
    await service.markPaid(draft.id);
    expect(service.byId(draft.id)?.status).toBe(InvoiceStatus.Draft);
    await service.save({ ...draft, status: InvoiceStatus.Unpaid });
    await service.markPaid(draft.id);
    expect(service.byId(draft.id)?.status).toBe(InvoiceStatus.Paid);
  });

  it('loads and migrates stored invoices', async () => {
    mocks.preferences.store.set(
      StorageKey.Invoices,
      JSON.stringify([{ id: 'i1', items: [{ hsn: '99', gstRate: 5 }] }]),
    );
    await service.load();
    expect(service.invoices()[0].items[0]).toMatchObject({ itemCode: '99', taxRate: 5 });
    expect(service.invoices()[0].regime).toBe('IN');
  });

  it('creates new items with the default tax rate unless one is given', () => {
    expect(service.newItem().taxRate).toBe(18);
    expect(service.newItem(5).taxRate).toBe(5);
  });

  it('replaces everything', async () => {
    await service.save(service.createDraft('2026-10-27'));
    await service.replaceAll([]);
    expect(service.invoices()).toEqual([]);
  });
});
