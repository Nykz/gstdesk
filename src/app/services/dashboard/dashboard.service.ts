import { Injectable, computed, inject, signal } from '@angular/core';
import { todayIso } from '../../utils/date.util';
import { computeDashboard } from '../../utils/dashboard.util';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly invoiceService = inject(InvoiceService);
  private readonly customerService = inject(CustomerService);
  private readonly businessService = inject(BusinessService);

  private readonly _today = signal(todayIso());
  readonly today = this._today.asReadonly();

  readonly stats = computed(() =>
    computeDashboard(
      this.invoiceService.invoices(),
      this.customerService.customers(),
      this.businessService.business(),
      this._today(),
    ),
  );

  /** Call when the dashboard is shown so "today" and overdue figures stay current. */
  refreshToday(): void {
    this._today.set(todayIso());
  }
}
