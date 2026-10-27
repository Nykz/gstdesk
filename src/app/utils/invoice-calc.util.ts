import { DisplayStatus, InvoiceStatus } from '../enums/invoice-status.enum';
import { Business } from '../interfaces/business.interface';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { InvoiceTotals, RateSummaryRow, TaxContext } from '../interfaces/tax.interface';
import { TaxRegime } from '../interfaces/tax-regime.interface';
import { isOverdue } from './date.util';
import { round2 } from './money.util';
import { buildTaxContext, calcTotals, summarizeByRate } from './tax-engine.util';
import { getRegime, hasRegions, isDomesticCountry, withCustomTaxName } from './tax-regimes';

export function invoiceRegime(invoice: Pick<Invoice, 'regime'>, business: Pick<Business, 'customTaxName'>): TaxRegime {
  return withCustomTaxName(getRegime(invoice.regime), business.customTaxName);
}

/** Same region means a domestic customer in the seller's region (or any domestic customer when the regime has no regions). */
export function isSameRegion(
  regime: TaxRegime,
  sellerRegion: string,
  customer: Pick<Customer, 'country' | 'regionCode'> | undefined,
): boolean {
  if (!customer) return true;
  if (!isDomesticCountry(regime, customer.country)) return false;
  return !hasRegions(regime) || customer.regionCode === sellerRegion;
}

export function invoiceContext(
  invoice: Invoice,
  business: Business,
  customer: Customer | undefined,
): TaxContext {
  const regime = invoiceRegime(invoice, business);
  const sellerRegion = invoice.sellerRegionCode ?? business.regionCode;
  return buildTaxContext(regime, {
    sameRegion: isSameRegion(regime, sellerRegion, customer),
    treatment: invoice.taxTreatment,
    invoiceCurrency: invoice.currency,
  });
}

export function invoiceTotals(invoice: Invoice, business: Business, customer: Customer | undefined): InvoiceTotals {
  return calcTotals(invoice.items, invoiceContext(invoice, business, customer));
}

export function invoiceRateSummary(
  invoice: Invoice,
  business: Business,
  customer: Customer | undefined,
): RateSummaryRow[] {
  return summarizeByRate(invoice.items, invoiceContext(invoice, business, customer));
}

export function displayStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>, today: string): DisplayStatus {
  return invoice.status === InvoiceStatus.Unpaid && isOverdue(invoice.dueDate, today) ? 'overdue' : invoice.status;
}

/** Converts an amount in the invoice currency to the home currency. */
export function toHomeCurrency(amount: number, invoice: Pick<Invoice, 'exchangeRate'>): number {
  return round2(amount * (invoice.exchangeRate || 1));
}

/** Number locale for an invoice: the regime's own locale, or en-US for a foreign currency. */
export function invoiceLocale(regime: TaxRegime, currency: string): string {
  return currency === regime.currency ? regime.locale : 'en-US';
}
