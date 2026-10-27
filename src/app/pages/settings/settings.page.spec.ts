import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { ThemeMode } from '../../enums/theme-mode.enum';
import { BackupService } from '../../services/backup/backup.service';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NotifyService } from '../../services/notify/notify.service';
import { ThemeService } from '../../services/theme/theme.service';
import { buildGstin } from '../../utils/gstin.util';
import { SettingsPage } from './settings.page';

const event = (value: unknown) => new CustomEvent('x', { detail: { value } });
const labelsOf = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement & { label?: string }>('ion-input, ion-select')].map((el) => el.label);

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let page: SettingsPage;
  let business: BusinessService;
  const toast = vi.fn();
  const confirm = vi.fn();

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    toast.mockReset().mockResolvedValue(undefined);
    confirm.mockReset();
    TestBed.configureTestingModule({
      providers: [...provideNativeMocks().providers, { provide: NotifyService, useValue: { toast, confirm } }],
    });
    business = TestBed.inject(BusinessService);
    fixture = TestBed.createComponent(SettingsPage);
    page = fixture.componentInstance;
    await settle();
  });

  it('starts clean with Save disabled', () => {
    expect(page.dirty()).toBe(false);
  });

  it('edits locally until saved, then persists', async () => {
    page.setText('name', event('Acme'));
    expect(page.dirty()).toBe(true);
    expect(business.business().name).toBe('');
    await page.save();
    expect(business.business().name).toBe('Acme');
    expect(page.dirty()).toBe(false);
    expect(toast).toHaveBeenCalledWith('Settings saved', 'success');
  });

  it('a valid GSTIN fills the state; an invalid one blocks saving', async () => {
    page.setTaxId(event(buildGstin('29', 'AABCU9603R').toLowerCase()));
    expect(page.form().regionCode).toBe('29');
    expect(page.taxIdError()).toBeNull();
    page.setTaxId(event('BADGSTIN'));
    expect(page.taxIdError()).toContain('GSTIN');
    await page.save();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('GSTIN'), 'danger');
    expect(business.business().taxId).toBe('');
  });

  it('changing the country resets currency, region, default rate, tax ID and bank codes', async () => {
    page.setText('taxId', event('X'));
    page.setText('bankCode', event('HDFC0000123'));
    page.setCountry(event('GB'));
    expect(page.form()).toMatchObject({
      country: 'GB', currency: 'GBP', regionCode: '', defaultTaxRate: 20, taxId: '', bankCode: '', paymentId: '',
    });
    await settle();
    const labels = labelsOf(fixture.nativeElement);
    expect(labels).toContain('VAT number');
    expect(labels).toContain('Sort code');
    expect(labels).not.toContain('State');
  });

  it('labels follow the regime for India too', async () => {
    const labels = labelsOf(fixture.nativeElement);
    expect(labels).toContain('GSTIN');
    expect(labels).toContain('IFSC');
    expect(labels).toContain('UPI ID');
    expect(labels).toContain('State');
  });

  it('manual-rate regimes get a number input for the default rate; CUSTOM asks for a tax name', async () => {
    page.setCountry(event('CUSTOM'));
    await settle();
    expect(page.rateAsSelect()).toBe(false);
    page.setText('customTaxName', event('Service levy'));
    expect(page.regime().taxName).toBe('Service levy');
    page.setDefaultRate(event('7.5'));
    expect(page.form().defaultTaxRate).toBe(7.5);
    expect(fixture.nativeElement.textContent).toContain('Name of your tax');
  });

  it('says rates are defaults, not tax advice', () => {
    expect(fixture.nativeElement.textContent).toContain('not tax advice');
  });

  it('switches the theme', async () => {
    await page.setTheme(event('dark'));
    expect(TestBed.inject(ThemeService).mode()).toBe(ThemeMode.Dark);
  });

  it('exports a backup', async () => {
    const download = vi.spyOn(TestBed.inject(BackupService), 'download').mockResolvedValue('gstdesk-backup-2026-10-27.json');
    await page.exportBackup();
    expect(download).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Saved gstdesk-backup-2026-10-27.json', 'success');
  });

  it('stays quiet when the share sheet is closed, and reports a real failure', async () => {
    const download = vi.spyOn(TestBed.inject(BackupService), 'download');
    download.mockRejectedValue(new Error('Share canceled'));
    await page.exportBackup();
    expect(toast).not.toHaveBeenCalled();
    download.mockRejectedValue(new Error('disk full'));
    await page.exportBackup();
    expect(toast).toHaveBeenCalledWith('Could not export the backup.', 'danger');
  });

  it('imports a backup file, and reports bad files', async () => {
    const restore = vi.spyOn(TestBed.inject(BackupService), 'restore');
    const good = new File([JSON.stringify({ business: { name: 'Imported' }, customers: [], invoices: [] })], 'b.json');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [good], configurable: true });
    await page.importBackup({ target: input } as unknown as Event);
    expect(business.business().name).toBe('Imported');
    expect(toast).toHaveBeenCalledWith('Backup restored', 'success');

    const bad = new File(['nope'], 'b.json');
    Object.defineProperty(input, 'files', { value: [bad], configurable: true });
    await page.importBackup({ target: input } as unknown as Event);
    expect(restore).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenLastCalledWith('This file is not valid JSON.', 'danger');

    Object.defineProperty(input, 'files', { value: [], configurable: true });
    await page.importBackup({ target: input } as unknown as Event);
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('opens the file picker', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    page.chooseBackup();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('loads demo data only after confirming', async () => {
    confirm.mockResolvedValueOnce(false);
    await page.loadDemo();
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
    confirm.mockResolvedValueOnce(true);
    await page.loadDemo();
    expect(TestBed.inject(CustomerService).customers()).toHaveLength(8);
    await settle();
    expect(page.form().name).toBe('Aarav Digital Studio');
  });

  it('starts fresh only after confirming', async () => {
    await TestBed.inject(DemoDataService).loadDemo();
    confirm.mockResolvedValueOnce(false);
    await page.startFresh();
    expect(TestBed.inject(InvoiceService).invoices().length).toBeGreaterThan(0);
    confirm.mockResolvedValueOnce(true);
    await page.startFresh();
    expect(TestBed.inject(InvoiceService).invoices()).toEqual([]);
    expect(TestBed.inject(CustomerService).customers()).toEqual([]);
  });
});
