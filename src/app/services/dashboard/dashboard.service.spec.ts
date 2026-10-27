import { TestBed } from '@angular/core/testing';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { todayIso } from '../../utils/date.util';
import { InvoiceService } from '../invoice/invoice.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let invoices: InvoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideNativeMocks().providers });
    service = TestBed.inject(DashboardService);
    invoices = TestBed.inject(InvoiceService);
  });

  it('starts empty', () => {
    expect(service.stats().hasData).toBe(false);
    expect(service.stats().months).toHaveLength(6);
  });

  it('recomputes when invoices change', async () => {
    const draft = invoices.createDraft();
    draft.items[0].rate = 1000;
    draft.items[0].taxRate = 0;
    await invoices.save({ ...draft, status: InvoiceStatus.Paid });
    expect(service.stats().billed).toBe(1000);
    expect(service.stats().collected).toBe(1000);
  });

  it('refreshes today', () => {
    service.refreshToday();
    expect(service.today()).toBe(todayIso());
  });
});
