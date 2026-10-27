import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NotifyService } from '../../services/notify/notify.service';
import { InvoicesPage } from './invoices.page';

const event = (value: string) => new CustomEvent('x', { detail: { value } });

describe('InvoicesPage', () => {
  let fixture: ComponentFixture<InvoicesPage>;
  let page: InvoicesPage;
  const toast = vi.fn();

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    toast.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...provideNativeMocks().providers, { provide: NotifyService, useValue: { toast } }],
    });
    fixture = TestBed.createComponent(InvoicesPage);
    page = fixture.componentInstance;
    await settle();
  });

  it('shows an empty state when there are no invoices', () => {
    expect(fixture.nativeElement.textContent).toContain('No invoices yet');
  });

  describe('with demo data', () => {
    beforeEach(async () => {
      await TestBed.inject(DemoDataService).loadDemo();
      await settle();
    });

    it('lists invoices newest first with counts per status', () => {
      const counts = page.counts();
      expect(counts.all).toBe(page.rows().length);
      expect(counts.draft).toBe(1);
      expect(counts.paid + counts.unpaid + counts.overdue + counts.draft).toBe(counts.all);
      expect(counts.overdue).toBeGreaterThan(0);
      expect(page.rows()[0].invoice.status).toBe('draft');
    });

    it('filters by status segment, overdue being derived', async () => {
      page.setFilter(event('overdue'));
      await settle();
      expect(page.rows().length).toBe(page.counts().overdue);
      expect(page.rows().every((r) => r.status === 'overdue' && r.invoice.status === 'unpaid')).toBe(true);
      page.setFilter(event('paid'));
      expect(page.rows().every((r) => r.status === 'paid')).toBe(true);
    });

    it('searches by number, customer and tax ID', () => {
      const first = page.rows()[1];
      page.setQuery(event(first.invoice.number.toLowerCase()));
      expect(page.rows().map((r) => r.invoice.number)).toContain(first.invoice.number);
      page.setQuery(event('zzzz'));
      expect(page.rows()).toEqual([]);
      page.setQuery(event(''));
      const withTaxId = page.rows().find((r) => r.taxId)!;
      page.setQuery(event(withTaxId.taxId.slice(0, 8)));
      expect(page.rows().length).toBeGreaterThan(0);
      page.setQuery(event(withTaxId.customerName.slice(0, 5).toUpperCase()));
      expect(page.rows().length).toBeGreaterThan(0);
    });

    it('shows the issued and due dates, total and tax per row', () => {
      const row = page.rows()[1];
      expect(row.issued).toMatch(/^\d{2} \w{3} \d{4}$/);
      expect(row.total).toMatch(/^₹/);
      expect(row.tax).toMatch(/^₹|No tax/);
      expect(fixture.nativeElement.textContent).toContain('Issued');
    });

    it('totals what is on screen in the home currency', async () => {
      page.setFilter(event('paid'));
      await settle();
      expect(page.homeTotal()).toMatch(/^₹/);
      expect(fixture.nativeElement.textContent).toContain('in INR');
    });

    it('marks an unpaid invoice paid without opening it', async () => {
      const row = page.rows().find((r) => r.canMarkPaid)!;
      const click = new Event('click', { cancelable: true });
      const stop = vi.spyOn(click, 'stopPropagation');
      await page.markPaid(row, click);
      expect(stop).toHaveBeenCalled();
      expect(TestBed.inject(InvoiceService).byId(row.invoice.id)?.status).toBe(InvoiceStatus.Paid);
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('paid'), 'success');
    });
  });

  it('shows "No tax" for an export and the amount in its own currency', async () => {
    const invoices = TestBed.inject(InvoiceService);
    const draft = invoices.createDraft('2026-10-01');
    draft.currency = 'USD';
    draft.exchangeRate = 83;
    draft.taxTreatment = TaxTreatment.Exempt;
    draft.items[0].rate = 100;
    await invoices.save({ ...draft, status: InvoiceStatus.Unpaid });
    await settle();
    const row = page.rows()[0];
    expect(row.tax).toBe('No tax');
    expect(row.total).toBe('$100.00');
    expect(row.home).toBe(8300);
  });

  it('refreshes today when entered', () => {
    expect(() => page.ionViewWillEnter()).not.toThrow();
  });
});
