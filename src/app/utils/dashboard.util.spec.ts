import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { defaultBusiness } from './business.util';
import { computeDashboard } from './dashboard.util';

const TODAY = '2026-10-27';
const business = { ...defaultBusiness('IN'), regionCode: '27' };

const customer = (id: string, regionCode = '27', country = 'IN'): Customer => ({
  id, name: `Customer ${id}`, taxId: '', country, regionCode, email: '', phone: '', address: '',
});

let counter = 0;
const invoice = (overrides: Partial<Invoice> & { amount?: number }): Invoice => {
  const { amount = 1000, ...rest } = overrides;
  counter++;
  return {
    id: `i${counter}`, number: `INV/26-27/${counter}`, customerId: 'a', issueDate: '2026-10-01',
    dueDate: '2026-10-16', status: InvoiceStatus.Paid, regime: 'IN', currency: 'INR', exchangeRate: 1,
    taxTreatment: TaxTreatment.Standard,
    items: [{ id: 'x', description: 'W', itemCode: '', quantity: 1, rate: amount, taxRate: 0 }],
    notes: '', ...rest,
  };
};

describe('computeDashboard', () => {
  const customers = [customer('a'), customer('b', '29'), customer('c', '27', 'US')];

  it('is empty without non-draft invoices but still has six month slots', () => {
    const stats = computeDashboard([invoice({ status: InvoiceStatus.Draft })], customers, business, TODAY);
    expect(stats.hasData).toBe(false);
    expect(stats.months).toHaveLength(6);
    expect(stats.months.map((m) => m.label)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
  });

  it('counts billed, collected, outstanding and overdue; drafts never count', () => {
    const stats = computeDashboard(
      [
        invoice({ amount: 1000, status: InvoiceStatus.Paid }),
        invoice({ amount: 500, status: InvoiceStatus.Unpaid, dueDate: '2026-11-10' }),
        invoice({ amount: 300, status: InvoiceStatus.Unpaid, dueDate: '2026-10-05' }),
        invoice({ amount: 9999, status: InvoiceStatus.Draft }),
      ],
      customers,
      business,
      TODAY,
    );
    expect(stats.billed).toBe(1800);
    expect(stats.collected).toBe(1000);
    expect(stats.outstanding).toBe(800);
    expect(stats.overdueAmount).toBe(300);
    expect(stats.overdueCount).toBe(1);
    expect(stats.collectedShare).toBeCloseTo(1000 / 1800);
  });

  it('headline figures cover the current April fiscal year only', () => {
    const stats = computeDashboard(
      [
        invoice({ amount: 100, issueDate: '2026-04-01' }),
        invoice({ amount: 700, issueDate: '2026-03-31' }),
      ],
      customers,
      business,
      TODAY,
    );
    expect(stats.billed).toBe(100);
    // the older invoice still appears in the six month chart window? March is outside May to Oct
    expect(stats.months.every((m) => m.billed === 0)).toBe(true);
  });

  it('converts each invoice with its own exchange rate', () => {
    const stats = computeDashboard(
      [
        invoice({ amount: 100, currency: 'USD', exchangeRate: 83, taxTreatment: TaxTreatment.Exempt, customerId: 'c' }),
        invoice({ amount: 1000 }),
      ],
      customers,
      business,
      TODAY,
    );
    expect(stats.billed).toBe(9300);
  });

  it('breaks tax down by label across CGST/SGST and IGST', () => {
    const taxed = (customerId: string) =>
      invoice({
        customerId,
        items: [{ id: 'x', description: 'W', itemCode: '', quantity: 1, rate: 1000, taxRate: 18 }],
      });
    const stats = computeDashboard([taxed('a'), taxed('b')], customers, business, TODAY);
    expect(stats.taxCollected).toEqual([
      { label: 'CGST', amount: 90 },
      { label: 'SGST', amount: 90 },
      { label: 'IGST', amount: 180 },
    ]);
    expect(stats.totalTax).toBe(360);
  });

  it('buckets billed vs collected by month and reports month over month', () => {
    const stats = computeDashboard(
      [
        invoice({ amount: 1000, issueDate: '2026-09-10', status: InvoiceStatus.Paid }),
        invoice({ amount: 1500, issueDate: '2026-10-10', status: InvoiceStatus.Unpaid }),
      ],
      customers,
      business,
      TODAY,
    );
    const sep = stats.months.find((m) => m.key === '2026-09');
    const oct = stats.months.find((m) => m.key === '2026-10');
    expect(sep).toMatchObject({ billed: 1000, collected: 1000 });
    expect(oct).toMatchObject({ billed: 1500, collected: 0 });
    expect(stats.monthOverMonth).toBe(50);
  });

  it('month over month is null without a base', () => {
    const stats = computeDashboard([invoice({ amount: 10 })], customers, business, TODAY);
    expect(stats.monthOverMonth).toBeNull();
  });

  it('ranks the top four customers by share', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((id) => customer(id));
    const stats = computeDashboard(
      [
        invoice({ customerId: 'a', amount: 100 }),
        invoice({ customerId: 'b', amount: 400 }),
        invoice({ customerId: 'c', amount: 300 }),
        invoice({ customerId: 'd', amount: 150 }),
        invoice({ customerId: 'e', amount: 50 }),
      ],
      many,
      business,
      TODAY,
    );
    expect(stats.topCustomers.map((c) => c.customerId)).toEqual(['b', 'c', 'd', 'a']);
    expect(stats.topCustomers[0].share).toBeCloseTo(0.4);
  });

  it('names a missing customer', () => {
    const stats = computeDashboard([invoice({ customerId: 'gone' })], [], business, TODAY);
    expect(stats.topCustomers[0].name).toBe('Unknown customer');
  });
});
