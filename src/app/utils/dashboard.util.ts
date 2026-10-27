import { InvoiceStatus } from '../enums/invoice-status.enum';
import { Business } from '../interfaces/business.interface';
import { Customer } from '../interfaces/customer.interface';
import { DashboardStats, MonthBar } from '../interfaces/dashboard.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { addMonths, fiscalYearRange, monthKey, monthShortName, parseIso } from './date.util';
import { invoiceTotals, toHomeCurrency } from './invoice-calc.util';
import { round2 } from './money.util';
import { getRegime } from './tax-regimes';

const MONTH_COUNT = 6;
const TOP_CUSTOMERS = 4;

export const EMPTY_DASHBOARD: DashboardStats = {
  billed: 0,
  collected: 0,
  outstanding: 0,
  overdueAmount: 0,
  overdueCount: 0,
  collectedShare: 0,
  taxCollected: [],
  totalTax: 0,
  months: [],
  monthOverMonth: null,
  topCustomers: [],
  hasData: false,
};

interface Priced {
  invoice: Invoice;
  total: number;
  taxByLabel: Map<string, number>;
}

/**
 * Figures in the home currency. Every invoice is converted with its own exchange rate and drafts never count.
 * Headline figures cover the current fiscal year; the bar chart covers the last six months.
 */
export function computeDashboard(
  invoices: Invoice[],
  customers: Customer[],
  business: Business,
  today: string,
): DashboardStats {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const priced: Priced[] = invoices
    .filter((invoice) => invoice.status !== InvoiceStatus.Draft)
    .map((invoice) => {
      const totals = invoiceTotals(invoice, business, customerById.get(invoice.customerId));
      const taxByLabel = new Map<string, number>();
      for (const line of totals.taxLines) {
        taxByLabel.set(line.label, toHomeCurrency(line.amount, invoice));
      }
      return { invoice, total: toHomeCurrency(totals.grandTotal, invoice), taxByLabel };
    });

  if (priced.length === 0) return { ...EMPTY_DASHBOARD, months: buildMonths([], today) };

  const startMonth = getRegime(business.country).fiscalYearStartMonth;
  const { from, to } = fiscalYearRange(today, startMonth);
  const inYear = priced.filter(({ invoice }) => invoice.issueDate >= from && invoice.issueDate <= to);

  let billed = 0;
  let collected = 0;
  let outstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  const tax = new Map<string, number>();
  const perCustomer = new Map<string, number>();

  for (const { invoice, total, taxByLabel } of inYear) {
    billed += total;
    if (invoice.status === InvoiceStatus.Paid) collected += total;
    else {
      outstanding += total;
      if (invoice.dueDate < today) {
        overdueAmount += total;
        overdueCount++;
      }
    }
    for (const [label, amount] of taxByLabel) tax.set(label, (tax.get(label) ?? 0) + amount);
    perCustomer.set(invoice.customerId, (perCustomer.get(invoice.customerId) ?? 0) + total);
  }

  const taxCollected = [...tax.entries()].map(([label, amount]) => ({ label, amount: round2(amount) }));
  const months = buildMonths(priced, today);
  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  return {
    billed: round2(billed),
    collected: round2(collected),
    outstanding: round2(outstanding),
    overdueAmount: round2(overdueAmount),
    overdueCount,
    collectedShare: billed > 0 ? collected / billed : 0,
    taxCollected,
    totalTax: round2(taxCollected.reduce((sum, row) => sum + row.amount, 0)),
    months,
    monthOverMonth:
      previous && previous.billed > 0 ? ((current.billed - previous.billed) / previous.billed) * 100 : null,
    topCustomers: [...perCustomer.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_CUSTOMERS)
      .map(([customerId, amount]) => ({
        customerId,
        name: customerById.get(customerId)?.name ?? 'Unknown customer',
        amount: round2(amount),
        share: billed > 0 ? amount / billed : 0,
      })),
    hasData: true,
  };
}

function buildMonths(priced: Priced[], today: string): MonthBar[] {
  const bars: MonthBar[] = [];
  for (let offset = MONTH_COUNT - 1; offset >= 0; offset--) {
    const key = monthKey(addMonths(`${today.slice(0, 7)}-01`, -offset));
    let billed = 0;
    let collected = 0;
    for (const { invoice, total } of priced) {
      if (monthKey(invoice.issueDate) !== key) continue;
      billed += total;
      if (invoice.status === InvoiceStatus.Paid) collected += total;
    }
    bars.push({
      key,
      label: monthShortName(parseIso(`${key}-01`).month),
      billed: round2(billed),
      collected: round2(collected),
    });
  }
  return bars;
}
