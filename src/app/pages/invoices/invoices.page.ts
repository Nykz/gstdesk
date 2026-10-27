import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonRow,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, checkmarkCircleOutline, trashOutline } from 'ionicons/icons';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { DisplayStatus } from '../../enums/invoice-status.enum';
import { Invoice } from '../../interfaces/invoice.interface';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NotifyService } from '../../services/notify/notify.service';
import { formatDisplayDate } from '../../utils/date.util';
import { eventValue } from '../../utils/event.util';
import {
  displayStatus,
  invoiceLocale,
  invoiceRegime,
  invoiceTotals,
  toHomeCurrency,
} from '../../utils/invoice-calc.util';
import { formatMoney, formatMoneyWhole } from '../../utils/money.util';
import { getRegime } from '../../utils/tax-regimes';

export type InvoiceFilter = 'all' | DisplayStatus;

export const FILTERS: { value: InvoiceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Drafts' },
];

export interface InvoiceRow {
  invoice: Invoice;
  customerName: string;
  taxId: string;
  status: DisplayStatus;
  issued: string;
  due: string;
  total: string;
  tax: string;
  taxLine: string;
  home: number;
  canMarkPaid: boolean;
}

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.page.html',
  styleUrls: ['./invoices.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton, IonButtons, IonCard, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonItem, IonLabel,
    IonList, IonMenuButton, IonRow, IonSearchbar, IonSegment, IonSegmentButton, IonText, IonTitle,
    IonToolbar, StatusBadgeComponent,
  ],
})
export class InvoicesPage {
  private readonly invoiceService = inject(InvoiceService);
  private readonly customerService = inject(CustomerService);
  private readonly businessService = inject(BusinessService);
  private readonly dashboard = inject(DashboardService);
  private readonly notify = inject(NotifyService);
  private readonly nav = inject(NavController);

  readonly filters = FILTERS;
  readonly filter = signal<InvoiceFilter>('all');
  readonly query = signal('');

  private readonly allRows = computed<InvoiceRow[]>(() => {
    const business = this.businessService.business();
    const today = this.dashboard.today();
    return [...this.invoiceService.invoices()]
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))
      .map((invoice) => {
        const customer = this.customerService.byId(invoice.customerId);
        const totals = invoiceTotals(invoice, business, customer);
        const locale = invoiceLocale(invoiceRegime(invoice, business), invoice.currency);
        const status = displayStatus(invoice, today);
        return {
          invoice,
          customerName: customer?.name ?? 'No customer',
          taxId: customer?.taxId ?? '',
          status,
          issued: formatDisplayDate(invoice.issueDate),
          due: formatDisplayDate(invoice.dueDate),
          total: formatMoney(totals.grandTotal, invoice.currency, locale),
          tax: totals.totalTax > 0 ? formatMoney(totals.totalTax, invoice.currency, locale) : 'No tax',
          taxLine: totals.totalTax > 0 ? `${getRegime(business.country).taxName} ${formatMoney(totals.totalTax, invoice.currency, locale)}` : 'No tax',
          home: toHomeCurrency(totals.grandTotal, invoice),
          canMarkPaid: invoice.status === 'unpaid',
        };
      });
  });

  readonly counts = computed(() => {
    const counts: Record<InvoiceFilter, number> = { all: 0, draft: 0, unpaid: 0, overdue: 0, paid: 0 };
    for (const row of this.allRows()) {
      counts.all++;
      counts[row.status]++;
    }
    return counts;
  });

  readonly rows = computed(() => {
    const filter = this.filter();
    const query = this.query().trim().toLowerCase();
    return this.allRows().filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (!query) return true;
      return [row.invoice.number, row.customerName, row.taxId].some((field) => field.toLowerCase().includes(query));
    });
  });

  readonly homeCurrency = computed(() => this.businessService.business().currency);
  readonly homeTotal = computed(() => {
    const business = this.businessService.business();
    const total = this.rows().reduce((sum, row) => sum + row.home, 0);
    return formatMoneyWhole(total, business.currency, getRegime(business.country).locale);
  });

  constructor() {
    addIcons({ addOutline, checkmarkCircleOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.dashboard.refreshToday();
  }

  newInvoice(): Promise<boolean> {
    return this.nav.navigateForward('/invoices/new');
  }

  open(row: InvoiceRow): Promise<boolean> {
    return this.nav.navigateForward(['/invoices', row.invoice.id]);
  }

  async remove(row: InvoiceRow, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const confirmed = await this.notify.confirm('Delete invoice?', `${row.invoice.number} will be permanently removed.`);
    if (!confirmed) return;
    await this.invoiceService.remove(row.invoice.id);
    await this.notify.toast('Invoice deleted');
  }

  setFilter(event: Event): void {
    this.filter.set(eventValue(event) as InvoiceFilter);
  }

  setQuery(event: Event): void {
    this.query.set(eventValue(event));
  }

  async markPaid(row: InvoiceRow, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    await this.invoiceService.markPaid(row.invoice.id);
    await this.notify.toast(`${row.invoice.number} marked as paid`, 'success');
  }
}
