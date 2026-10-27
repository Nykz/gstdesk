import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkDoneOutline,
  cloudDownloadOutline,
  documentOutline,
  informationCircleOutline,
  personAddOutline,
  printOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';
import { CustomerFormComponent, CustomerDraft } from '../../components/customer-form/customer-form.component';
import { InvoiceItemsComponent } from '../../components/invoice-items/invoice-items.component';
import { InvoicePaperComponent } from '../../components/invoice-paper/invoice-paper.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { Invoice, InvoiceItem } from '../../interfaces/invoice.interface';
import { ValidationIssue } from '../../interfaces/validation.interface';
import { ExchangeRateService } from '../../services/exchange-rate/exchange-rate.service';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NativeShellService } from '../../services/native-shell/native-shell.service';
import { NotifyService } from '../../services/notify/notify.service';
import { PrintService } from '../../services/print/print.service';
import { CURRENCIES, countryName, currencyForCountry } from '../../utils/countries';
import { addDays, daysBetween, isIsoDate, todayIso } from '../../utils/date.util';
import { eventChecked, eventNumber, eventValue } from '../../utils/event.util';
import {
  displayStatus,
  invoiceLocale,
  invoiceRegime,
  invoiceTotals,
} from '../../utils/invoice-calc.util';
import { validateInvoice } from '../../utils/invoice-validation.util';
import { formatMoney } from '../../utils/money.util';
import { getRegime, isDomesticCountry } from '../../utils/tax-regimes';

export const PAYMENT_TERMS = [7, 15, 30, 45];

/** A4 width at 96 dpi: the paper is laid out at this width and scaled down to fit the preview pane. */
export const PAPER_WIDTH_PX = 794;

@Component({
  selector: 'app-invoice-editor',
  templateUrl: './invoice-editor.page.html',
  styleUrls: ['./invoice-editor.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
  imports: [
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonCol,
    IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonRow, IonSegment,
    IonSegmentButton, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle, IonToggle, IonToolbar,
    InvoiceItemsComponent, InvoicePaperComponent, StatusBadgeComponent,
  ],
})
export class InvoiceEditorPage {
  private readonly router = inject(Router);
  private readonly invoiceService = inject(InvoiceService);
  private readonly customerService = inject(CustomerService);
  private readonly businessService = inject(BusinessService);
  private readonly nativeShell = inject(NativeShellService);
  private readonly printService = inject(PrintService);
  private readonly modalController = inject(ModalController);
  private readonly notify = inject(NotifyService);
  private readonly exchangeRates = inject(ExchangeRateService);

  /** Route param `:id`. Missing on /invoices/new. */
  readonly id = input<string | undefined>(undefined);
  private readonly paper = viewChild.required(InvoicePaperComponent, { read: ElementRef });
  private readonly previewPane = viewChild.required('previewPane', { read: ElementRef<HTMLElement> });
  private readonly destroyRef = inject(DestroyRef);

  readonly invoice = signal<Invoice>(this.invoiceService.createDraft());
  readonly isNew = signal(true);
  readonly issues = signal<ValidationIssue[]>([]);
  readonly view = signal<'edit' | 'preview'>('edit');
  /** True while the exempt switch was flipped automatically by choosing a foreign customer. */
  readonly autoExempt = signal(false);
  /** True while the invoice currency was switched automatically to the foreign customer's currency. */
  readonly autoCurrency = signal(false);
  readonly fetchingRate = signal(false);
  /** Zoom that fits the A4 paper into the preview pane (never enlarges). */
  readonly previewScale = signal(1);

  readonly customers = this.customerService.customers;
  readonly business = this.businessService.business;
  readonly currencies = CURRENCIES;
  readonly terms = PAYMENT_TERMS;
  readonly InvoiceStatus = InvoiceStatus;

  readonly regime = computed(() => invoiceRegime(this.invoice(), this.business()));
  readonly customer = computed(() => this.customerService.byId(this.invoice().customerId));
  readonly totals = computed(() => invoiceTotals(this.invoice(), this.business(), this.customer()));
  readonly locale = computed(() => invoiceLocale(this.regime(), this.invoice().currency));
  readonly exempt = computed(() => this.invoice().taxTreatment === TaxTreatment.Exempt);
  readonly foreign = computed(() => this.invoice().currency !== this.business().currency);
  readonly status = computed(() => displayStatus(this.invoice(), todayIso()));
  readonly activeTerm = computed(() => {
    const { issueDate, dueDate } = this.invoice();
    return isIsoDate(issueDate) && isIsoDate(dueDate) ? daysBetween(issueDate, dueDate) : -1;
  });
  readonly homeLocale = computed(() => getRegime(this.business().country).locale);
  readonly customerCountry = computed(() => {
    const customer = this.customer();
    return customer ? countryName(customer.country) : '';
  });

  readonly totalLines = computed(() =>
    this.totals().taxLines.map((line) => ({ label: line.label, amount: this.money(line.amount) })),
  );

  private active = true;
  private seenPrintRequests = this.nativeShell.printRequests();

  constructor() {
    addIcons({
      alertCircleOutline, checkmarkDoneOutline, cloudDownloadOutline, documentOutline, informationCircleOutline, personAddOutline,
      printOutline, saveOutline, trashOutline,
    });

    afterNextRender(() => this.fitPreview());

    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });

    effect(() => {
      const requests = this.nativeShell.printRequests();
      if (requests === this.seenPrintRequests) return;
      this.seenPrintRequests = requests;
      untracked(() => {
        if (this.active) void this.print();
      });
    });
  }

  ionViewWillEnter(): void {
    this.active = true;
    if (!this.id()) this.load(undefined);
  }

  ionViewWillLeave(): void {
    this.active = false;
  }

  load(id: string | undefined): void {
    this.issues.set([]);
    this.autoExempt.set(false);
    this.autoCurrency.set(false);
    this.view.set('edit');
    if (!id) {
      this.invoice.set(this.invoiceService.createDraft());
      this.isNew.set(true);
      return;
    }
    const existing = this.invoiceService.byId(id);
    if (!existing) {
      void this.notify.toast('That invoice no longer exists', 'danger');
      void this.router.navigateByUrl('/invoices', { replaceUrl: true });
      return;
    }
    this.invoice.set({ ...existing, items: existing.items.map((item) => ({ ...item })) });
    this.isNew.set(false);
  }

  // ---- editing ----------------------------------------------------------------

  patch(changes: Partial<Invoice>): void {
    this.invoice.update((invoice) => ({ ...invoice, ...changes }));
  }

  setView(event: Event): void {
    this.view.set(eventValue(event) === 'preview' ? 'preview' : 'edit');
  }

  setCustomer(event: Event): void {
    const customerId = eventValue(event);
    const customer = this.customerService.byId(customerId);
    this.patch({ customerId });
    if (!customer) return;
    const domestic = isDomesticCountry(this.regime(), customer.country);
    const home = this.business().currency;
    if (!domestic && !this.exempt()) {
      this.patch({ taxTreatment: TaxTreatment.Exempt });
      this.autoExempt.set(true);
      // An export is normally billed in the customer's currency; the rate to home currency is left to the user.
      const currency = currencyForCountry(customer.country);
      if (currency && currency !== home && this.invoice().currency === home) {
        this.patch({ currency, exchangeRate: 0 });
        this.autoCurrency.set(true);
      }
    } else if (domestic && this.autoExempt()) {
      this.patch({ taxTreatment: TaxTreatment.Standard });
      this.autoExempt.set(false);
      if (this.autoCurrency()) {
        this.patch({ currency: home, exchangeRate: 1 });
        this.autoCurrency.set(false);
      }
    }
  }

  async addCustomer(): Promise<void> {
    const modal = await this.modalController.create({ component: CustomerFormComponent });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<CustomerDraft>();
    if (role !== 'save' || !data) return;
    const customer = await this.customerService.add(data);
    this.setCustomer(new CustomEvent('ionChange', { detail: { value: customer.id } }));
  }

  setIssueDate(event: Event): void {
    const issueDate = eventValue(event);
    const current = this.invoice();
    if (!isIsoDate(issueDate)) {
      this.patch({ issueDate });
      return;
    }
    const terms = this.activeTerm() >= 0 ? this.activeTerm() : 15;
    const changes: Partial<Invoice> = { issueDate, dueDate: addDays(issueDate, terms) };
    if (this.isNew()) {
      const number = this.invoiceService.nextNumber(issueDate);
      if (number !== current.number) changes.number = number;
    }
    this.patch(changes);
  }

  setDueDate(event: Event): void {
    this.patch({ dueDate: eventValue(event) });
  }

  setTerms(days: number): void {
    const { issueDate } = this.invoice();
    if (isIsoDate(issueDate)) this.patch({ dueDate: addDays(issueDate, days) });
  }

  setCurrency(event: Event): void {
    const currency = eventValue(event);
    const home = this.business().currency;
    this.autoCurrency.set(false);
    this.patch({ currency, exchangeRate: currency === home ? 1 : 0 });
  }

  setExchangeRate(event: Event): void {
    this.patch({ exchangeRate: eventNumber(event) });
  }

  /** Fills today's reference rate for the invoice currency in the owner's own currency. */
  async fetchRate(): Promise<void> {
    const { currency } = this.invoice();
    const home = this.business().currency;
    this.fetchingRate.set(true);
    try {
      const rate = await this.exchangeRates.latest(currency, home);
      if (rate === null) {
        await this.notify.toast(`Could not get today's ${currency} to ${home} rate. Enter it yourself.`, 'danger');
        return;
      }
      // Six significant digits keeps small rates (1 INR = 0.0105 USD) as exact as large ones (1 USD = 83.1235 INR).
      const rounded = Number(rate.toPrecision(6));
      this.patch({ exchangeRate: rounded });
      await this.notify.toast(`1 ${currency} = ${rounded} ${home} (today's reference rate)`, 'success');
    } finally {
      this.fetchingRate.set(false);
    }
  }

  setExempt(event: Event): void {
    this.autoExempt.set(false);
    this.patch({ taxTreatment: eventChecked(event) ? TaxTreatment.Exempt : TaxTreatment.Standard });
  }

  setItems(items: InvoiceItem[]): void {
    this.patch({ items });
  }

  setNotes(event: Event): void {
    this.patch({ notes: eventValue(event) });
  }

  // ---- actions ----------------------------------------------------------------

  /** Drafts are never validated. */
  async saveDraft(): Promise<void> {
    this.issues.set([]);
    await this.persist({ ...this.invoice(), status: InvoiceStatus.Draft }, 'Draft saved');
  }

  /** Validation blocks issuing. */
  async saveInvoice(): Promise<boolean> {
    if (!this.validate()) return false;
    const status = this.invoice().status === InvoiceStatus.Paid ? InvoiceStatus.Paid : InvoiceStatus.Unpaid;
    await this.persist({ ...this.invoice(), status }, 'Invoice saved');
    return true;
  }

  async markPaid(): Promise<void> {
    if (!this.validate()) return;
    await this.persist({ ...this.invoice(), status: InvoiceStatus.Paid }, 'Marked as paid');
  }

  async remove(): Promise<void> {
    const confirmed = await this.notify.confirm(
      'Delete invoice?',
      `${this.invoice().number} will be permanently removed.`,
    );
    if (!confirmed) return;
    await this.invoiceService.remove(this.invoice().id);
    await this.notify.toast('Invoice deleted');
    await this.router.navigateByUrl('/invoices', { replaceUrl: true });
  }

  async print(): Promise<void> {
    const paper = (this.paper().nativeElement as HTMLElement).querySelector<HTMLElement>('.paper');
    if (!paper) return;
    try {
      await this.printService.print(paper, this.invoice().number.replace(/[\\/]/g, '-'));
    } catch {
      await this.notify.toast('Could not open the print dialog.', 'danger');
    }
  }

  /** Cmd/Ctrl+S saves: a draft stays a draft, an issued invoice is re-validated. */
  onKeydown(event: KeyboardEvent): void {
    if (!this.active || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    event.preventDefault();
    if (this.invoice().status === InvoiceStatus.Draft) void this.saveDraft();
    else void this.saveInvoice();
  }

  money(value: number): string {
    return formatMoney(value, this.invoice().currency, this.locale());
  }

  // ---- internals --------------------------------------------------------------

  private fitPreview(): void {
    const pane = this.previewPane().nativeElement;
    const update = () => {
      if (pane.clientWidth > 0) this.previewScale.set(Math.min(1, pane.clientWidth / PAPER_WIDTH_PX));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(pane);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private validate(): boolean {
    const issues = validateInvoice(this.invoice(), this.business(), this.customer());
    this.issues.set(issues);
    if (issues.length > 0) {
      void this.notify.toast(`Fix ${issues.length} thing${issues.length === 1 ? '' : 's'} before issuing`, 'danger');
    }
    return issues.length === 0;
  }

  private async persist(invoice: Invoice, message: string): Promise<void> {
    const wasNew = this.isNew();
    let toSave = invoice;
    if (wasNew && this.invoiceService.invoices().some((i) => i.number === invoice.number)) {
      toSave = { ...invoice, number: this.invoiceService.nextNumber(invoice.issueDate) };
    }
    await this.invoiceService.save(toSave);
    this.invoice.set(toSave);
    this.isNew.set(false);
    await this.notify.toast(message, 'success');
    if (wasNew) await this.router.navigateByUrl(`/invoices/${toSave.id}`, { replaceUrl: true });
  }
}
