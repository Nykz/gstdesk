import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { TaxEngine } from '../../enums/tax-engine.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { Business } from '../../interfaces/business.interface';
import { Customer } from '../../interfaces/customer.interface';
import { Invoice } from '../../interfaces/invoice.interface';
import { amountInWords } from '../../utils/amount-in-words.util';
import { formatDisplayDate } from '../../utils/date.util';
import { COUNTRIES, countryName } from '../../utils/countries';
import {
  invoiceContext,
  invoiceLocale,
  invoiceRateSummary,
  invoiceRegime,
  invoiceTotals,
} from '../../utils/invoice-calc.util';
import { formatAmount, formatMoney, formatRate } from '../../utils/money.util';
import { lineTaxable } from '../../utils/tax-engine.util';
import { customerTaxIdLabel } from '../../utils/tax-id.util';
import { getRegime, regionName } from '../../utils/tax-regimes';

/** The printed invoice. Always black on white, whatever the app theme. */
@Component({
  selector: 'app-invoice-paper',
  templateUrl: './invoice-paper.component.html',
  styleUrls: ['./invoice-paper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicePaperComponent {
  readonly invoice = input.required<Invoice>();
  readonly business = input.required<Business>();
  readonly customer = input<Customer | undefined>(undefined);

  readonly regime = computed(() => invoiceRegime(this.invoice(), this.business()));
  readonly context = computed(() => invoiceContext(this.invoice(), this.business(), this.customer()));
  readonly totals = computed(() => invoiceTotals(this.invoice(), this.business(), this.customer()));
  readonly summary = computed(() => invoiceRateSummary(this.invoice(), this.business(), this.customer()));
  readonly locale = computed(() => invoiceLocale(this.regime(), this.invoice().currency));
  readonly homeLocale = computed(() => getRegime(this.business().country).locale);

  readonly exempt = computed(() => this.invoice().taxTreatment === TaxTreatment.Exempt);
  readonly paid = computed(() => this.invoice().status === InvoiceStatus.Paid);
  readonly foreign = computed(() => this.invoice().currency !== this.business().currency);
  readonly showItemCode = computed(() => this.invoice().items.some((item) => item.itemCode.trim() !== ''));
  readonly showTaxTable = computed(() => !this.exempt() && this.totals().totalTax > 0);

  readonly words = computed(() => amountInWords(this.totals().grandTotal, this.invoice().currency));

  readonly rows = computed(() =>
    this.invoice().items.map((item, index) => ({
      index: index + 1,
      description: item.description,
      itemCode: item.itemCode,
      quantity: item.quantity,
      rate: this.amount(item.rate),
      taxRate: item.taxRate,
      amount: this.amount(lineTaxable(item)),
    })),
  );

  readonly summaryRows = computed(() =>
    this.summary().map((row) => ({
      rate: row.rate,
      taxable: this.amount(row.taxable),
      parts: row.taxLines.map((line) => ({ label: line.label, amount: this.amount(line.amount) })),
      totalTax: this.amount(row.totalTax),
    })),
  );

  readonly taxHeadings = computed(() => this.totals().taxLines.map((line) => line.label));

  readonly totalLines = computed(() =>
    this.totals().taxLines.map((line) => ({ label: line.label, amount: this.money(line.amount) })),
  );

  /** A customer outside the regime has a foreign tax ID, so it is not called a GSTIN or VAT number. */
  readonly customerTaxLabel = computed(() => {
    const customer = this.customer();
    const regime = this.regime();
    return customerTaxIdLabel(regime, !customer || regime.domesticCountries.includes(customer.country));
  });

  readonly supplyLabel = computed(() => {
    const customer = this.customer();
    if (!customer) return '';
    const regime = this.regime();
    const domestic = regime.domesticCountries.includes(customer.country);
    const region = domestic && customer.regionCode ? regionName(regime, customer.regionCode) : '';
    if (regime.engine === TaxEngine.SplitByRegion && domestic && region) {
      return `Place of supply: ${region} (${customer.regionCode})`;
    }
    const place = [region, COUNTRIES.some((c) => c.code === customer.country) ? countryName(customer.country) : customer.country]
      .filter(Boolean)
      .join(', ');
    return `Supply to: ${place}`;
  });

  readonly exchangeNote = computed(() => {
    if (!this.foreign()) return '';
    const invoice = this.invoice();
    const home = formatRate(invoice.exchangeRate, this.business().currency, this.homeLocale());
    return `Exchange rate: 1 ${invoice.currency} = ${home}`;
  });

  readonly hasBankDetails = computed(() => {
    const b = this.business();
    return Boolean(b.bankName || b.accountNumber || b.bankCode || b.paymentId);
  });

  readonly contactLine = computed(() =>
    [this.business().email, this.business().phone].filter((part) => part !== '').join(' · '),
  );

  readonly issueDate = computed(() => formatDisplayDate(this.invoice().issueDate));
  readonly dueDate = computed(() => formatDisplayDate(this.invoice().dueDate));

  money(value: number): string {
    return formatMoney(value, this.invoice().currency, this.locale());
  }

  amount(value: number): string {
    return formatAmount(value, this.locale());
  }
}
