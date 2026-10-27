import { TestBed } from '@angular/core/testing';
import { FILESYSTEM, IS_NATIVE, SHARE } from '../../tokens/native-plugins.tokens';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { DemoDataService } from '../demo-data/demo-data.service';
import { InvoiceService } from '../invoice/invoice.service';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideNativeMocks().providers });
    service = TestBed.inject(BackupService);
  });

  it('builds a version 2 backup', async () => {
    await TestBed.inject(DemoDataService).loadDemo('2026-10-27');
    const backup = service.build();
    expect(backup.version).toBe(2);
    expect(backup.business.name).toBe('Aarav Digital Studio');
    expect(backup.customers).toHaveLength(8);
    expect(backup.invoices.length).toBeGreaterThan(0);
  });

  it('round-trips through restore', async () => {
    await TestBed.inject(DemoDataService).loadDemo('2026-10-27');
    const text = JSON.stringify(service.build());
    await TestBed.inject(DemoDataService).startFresh();
    await service.restore(text);
    expect(TestBed.inject(BusinessService).business().name).toBe('Aarav Digital Studio');
    expect(TestBed.inject(CustomerService).customers()).toHaveLength(8);
    expect(TestBed.inject(InvoiceService).invoices().length).toBeGreaterThan(0);
  });

  it('upgrades an old India-only backup on import', async () => {
    await service.restore(
      JSON.stringify({
        version: 1,
        business: { name: 'Legacy', gstin: '27AAPFU0939F1ZV', ifsc: 'HDFC0000123', upiId: 'a@b' },
        customers: [{ id: 'c1', name: 'C', gstin: '29AABCK1234F1Z5', stateCode: '29' }],
        invoices: [{ id: 'i1', customerId: 'c1', items: [{ hsn: '9983', gstRate: 18, rate: 10 }] }],
      }),
    );
    expect(TestBed.inject(BusinessService).business()).toMatchObject({
      taxId: '27AAPFU0939F1ZV',
      bankCode: 'HDFC0000123',
      paymentId: 'a@b',
    });
    expect(TestBed.inject(CustomerService).customers()[0]).toMatchObject({ regionCode: '29' });
    expect(TestBed.inject(InvoiceService).invoices()[0].items[0]).toMatchObject({ itemCode: '9983', taxRate: 18 });
  });

  it('rejects files that are not backups', async () => {
    await expect(service.restore('not json')).rejects.toThrow('not valid JSON');
    await expect(service.restore('{"a":1}')).rejects.toThrow('not a valid backup');
  });

  it('downloads a dated JSON file', async () => {
    const createUrl = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const name = await service.download();
    expect(name).toMatch(/^gstdesk-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
  });

  describe('inside the Android / iOS app', () => {
    const writeFile = vi.fn();
    const share = vi.fn();

    beforeEach(() => {
      writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/gstdesk-backup.json' });
      share.mockReset().mockResolvedValue({});
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...provideNativeMocks().providers,
          { provide: IS_NATIVE, useValue: true },
          { provide: FILESYSTEM, useValue: { writeFile } },
          { provide: SHARE, useValue: { share } },
        ],
      });
      service = TestBed.inject(BackupService);
    });

    it('writes the backup to the cache and opens the share sheet instead of a download link', async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const name = await service.download();
      expect(name).toMatch(/^gstdesk-backup-\d{4}-\d{2}-\d{2}\.json$/);
      expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: name, directory: 'CACHE', encoding: 'utf8' }));
      expect(JSON.parse(writeFile.mock.calls[0][0].data).version).toBe(2);
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///cache/gstdesk-backup.json' }));
      expect(click).not.toHaveBeenCalled();
      click.mockRestore();
    });

    it('passes a cancelled share sheet up so the page can ignore it', async () => {
      share.mockRejectedValue(new Error('Share canceled'));
      await expect(service.download()).rejects.toThrow('canceled');
    });
  });
});
