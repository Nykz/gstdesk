import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonProgressBar,
  IonRow,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  arrowForwardOutline,
  receiptOutline,
  sparklesOutline,
  timeOutline,
  trendingDownOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { BarChartComponent } from '../../components/bar-chart/bar-chart.component';
import { DonutChartComponent } from '../../components/donut-chart/donut-chart.component';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { formatDisplayDate, fiscalYearLabel } from '../../utils/date.util';
import { displayStatus, invoiceTotals, toHomeCurrency } from '../../utils/invoice-calc.util';
import { formatMoney, formatMoneyCompact, formatMoneyWhole } from '../../utils/money.util';
import { getRegime } from '../../utils/tax-regimes';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BarChartComponent, DonutChartComponent, KpiCardComponent, StatusBadgeComponent, IonAvatar, IonButton,
    IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonCol,
    IonContent, IonGrid, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar,
    IonRow, IonText, IonTitle, IonToolbar,
  ],
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly businessService = inject(BusinessService);
  private readonly customerService = inject(CustomerService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly demoData = inject(DemoDataService);
  private readonly nav = inject(NavController);

  readonly stats = this.dashboard.stats;
  readonly business = this.businessService.business;

  readonly currency = computed(() => this.business().currency);
  readonly locale = computed(() => getRegime(this.business().country).locale);
  readonly fiscalYear = computed(() =>
    fiscalYearLabel(this.dashboard.today(), getRegime(this.business().country).fiscalYearStartMonth),
  );

  readonly taxName = computed(() => getRegime(this.business().country).taxName);
  readonly invoiceCount = computed(
    () => this.invoiceService.invoices().filter((invoice) => invoice.status !== 'draft').length,
  );
  readonly overdueCaption = computed(() => {
    const count = this.stats().overdueCount;
    return `${count} invoice${count === 1 ? '' : 's'} past due`;
  });
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const first = this.business().name.trim().split(/\s+/)[0];
    return first ? `Good ${part}, ${first}` : `Good ${part}`;
  });

  readonly donutSegments = computed(() =>
    this.stats().taxCollected.map((row) => ({ label: row.label, value: row.amount })),
  );

  readonly monthChange = computed(() => {
    const change = this.stats().monthOverMonth;
    if (change === null) return null;
    return { up: change >= 0, percent: `${Math.abs(change).toFixed(0)}%` };
  });

  /** Latest invoices, newest first. */
  readonly recent = computed(() => {
    const today = this.dashboard.today();
    return [...this.invoiceService.invoices()]
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))
      .slice(0, 6)
      .map((invoice) => {
        const customer = this.customerService.byId(invoice.customerId);
        const totals = invoiceTotals(invoice, this.business(), customer);
        return {
          invoice,
          customerName: customer?.name ?? 'Unknown customer',
          issued: formatDisplayDate(invoice.issueDate),
          status: displayStatus(invoice, today),
          total: formatMoney(totals.grandTotal, invoice.currency, this.localeFor(invoice.currency)),
          home: toHomeCurrency(totals.grandTotal, invoice),
        };
      });
  });

  constructor() {
    addIcons({
      addOutline, alertCircleOutline, arrowForwardOutline, receiptOutline, sparklesOutline, timeOutline,
      trendingDownOutline, trendingUpOutline,
    });
  }

  ionViewWillEnter(): void {
    this.dashboard.refreshToday();
  }

  money(value: number): string {
    return formatMoney(value, this.currency(), this.locale());
  }

  whole(value: number): string {
    return formatMoneyWhole(value, this.currency(), this.locale());
  }

  compact(value: number): string {
    return formatMoneyCompact(value, this.currency(), this.locale());
  }

  newInvoice(): Promise<boolean> {
    return this.nav.navigateForward('/invoices/new');
  }

  viewAll(): Promise<boolean> {
    return this.nav.navigateForward('/invoices');
  }

  open(id: string): Promise<boolean> {
    return this.nav.navigateForward(['/invoices', id]);
  }

  percent(share: number): string {
    return `${(share * 100).toFixed(0)}%`;
  }

  loadDemo(): Promise<void> {
    return this.demoData.loadDemo();
  }

  private localeFor(currency: string): string {
    return currency === this.currency() ? this.locale() : 'en-US';
  }
}
