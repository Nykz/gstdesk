import { Injectable, inject, signal } from '@angular/core';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { StorageKey } from '../../enums/storage-key.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { Invoice, InvoiceItem } from '../../interfaces/invoice.interface';
import { addDays, todayIso } from '../../utils/date.util';
import { newId } from '../../utils/id.util';
import { nextInvoiceNumber } from '../../utils/invoice-number.util';
import { migrateInvoices } from '../../utils/migrate.util';
import { getRegime } from '../../utils/tax-regimes';
import { BusinessService } from '../business/business.service';
import { StorageService } from '../storage/storage.service';

export const DEFAULT_TERMS_DAYS = 15;

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly storage = inject(StorageService);
  private readonly businessService = inject(BusinessService);

  private readonly _invoices = signal<Invoice[]>([]);
  readonly invoices = this._invoices.asReadonly();

  async load(): Promise<void> {
    this._invoices.set(migrateInvoices(await this.storage.get<unknown>(StorageKey.Invoices, [])));
  }

  byId(id: string): Invoice | undefined {
    return this._invoices().find((invoice) => invoice.id === id);
  }

  /** Next number for the fiscal year containing `issueDate`. */
  nextNumber(issueDate: string): string {
    const business = this.businessService.business();
    const startMonth = getRegime(business.country).fiscalYearStartMonth;
    return nextInvoiceNumber(
      business.invoicePrefix,
      issueDate,
      startMonth,
      this._invoices().map((invoice) => invoice.number),
    );
  }

  newItem(taxRate?: number): InvoiceItem {
    return {
      id: newId('item'),
      description: '',
      itemCode: '',
      quantity: 1,
      rate: 0,
      taxRate: taxRate ?? this.businessService.business().defaultTaxRate,
    };
  }

  /**
   * A blank draft that snapshots the regime, currency, rate and treatment so later Settings changes
   * never rewrite it. Not saved until the user saves it.
   */
  createDraft(today = todayIso()): Invoice {
    const business = this.businessService.business();
    return {
      id: newId('inv'),
      number: this.nextNumber(today),
      customerId: '',
      issueDate: today,
      dueDate: addDays(today, DEFAULT_TERMS_DAYS),
      status: InvoiceStatus.Draft,
      regime: business.country,
      currency: business.currency,
      exchangeRate: 1,
      taxTreatment: TaxTreatment.Standard,
      items: [this.newItem()],
      notes: '',
      sellerRegionCode: business.regionCode,
    };
  }

  async save(invoice: Invoice): Promise<void> {
    const exists = this._invoices().some((i) => i.id === invoice.id);
    await this.persist(
      exists ? this._invoices().map((i) => (i.id === invoice.id ? invoice : i)) : [...this._invoices(), invoice],
    );
  }

  async markPaid(id: string): Promise<void> {
    const invoice = this.byId(id);
    if (invoice && invoice.status !== InvoiceStatus.Draft) {
      await this.save({ ...invoice, status: InvoiceStatus.Paid });
    }
  }

  async remove(id: string): Promise<void> {
    await this.persist(this._invoices().filter((i) => i.id !== id));
  }

  async replaceAll(invoices: Invoice[]): Promise<void> {
    await this.persist(invoices);
  }

  private async persist(invoices: Invoice[]): Promise<void> {
    this._invoices.set(invoices);
    await this.storage.set(StorageKey.Invoices, invoices);
  }
}
