import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { defaultBusiness } from './business.util';
import {
  displayStatus,
  invoiceRateSummary,
  invoiceLocale,
  invoiceRegime,
  invoiceTotals,
  isSameRegion,
  toHomeCurrency,
} from './invoice-calc.util';
import { getRegime } from './tax-regimes';

const customer = (country: string, regionCode: string): Customer => ({
  id: 'c',
  name: 'C',
  taxId: '',
  country,
  regionCode,
  email: '',
  phone: '',
  address: '',
});

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'i',
  number: 'INV/26-27/001',
  customerId: 'c',
  issueDate: '2026-10-01',
  dueDate: '2026-10-16',
  status: InvoiceStatus.Unpaid,
  regime: 'IN',
  currency: 'INR',
  exchangeRate: 1,
  taxTreatment: TaxTreatment.Standard,
  items: [{ id: 'a', description: 'Work', itemCode: '', quantity: 1, rate: 1000, taxRate: 18 }],
  notes: '',
  ...overrides,
});

describe('invoice-calc.util', () => {
  const business = { ...defaultBusiness('IN'), regionCode: '27' };

  it('same region only for a domestic customer in the seller region', () => {
    const india = getRegime('IN');
    expect(isSameRegion(india, '27', customer('IN', '27'))).toBe(true);
    expect(isSameRegion(india, '27', customer('IN', '29'))).toBe(false);
    expect(isSameRegion(india, '27', customer('US', '27'))).toBe(false);
    expect(isSameRegion(india, '27', undefined)).toBe(true);
    expect(isSameRegion(getRegime('GB'), '', customer('GB', ''))).toBe(true);
  });

  it('splits CGST + SGST inside the state and IGST outside', () => {
    expect(invoiceTotals(invoice(), business, customer('IN', '27')).taxLines.map((l) => l.label)).toEqual([
      'CGST',
      'SGST',
    ]);
    expect(invoiceTotals(invoice(), business, customer('IN', '29')).taxLines.map((l) => l.label)).toEqual([
      'IGST',
    ]);
  });

  it('uses the seller region snapshotted on the invoice, not the current Settings', () => {
    const moved = { ...business, regionCode: '29' };
    const totals = invoiceTotals(invoice({ sellerRegionCode: '27' }), moved, customer('IN', '27'));
    expect(totals.taxLines.map((l) => l.label)).toEqual(['CGST', 'SGST']);
  });

  it('summarizes by rate', () => {
    expect(invoiceRateSummary(invoice(), business, customer('IN', '27'))).toHaveLength(1);
  });

  it('applies the custom tax name for the CUSTOM regime', () => {
    const custom = { ...defaultBusiness('CUSTOM'), customTaxName: 'Levy' };
    expect(invoiceRegime(invoice({ regime: 'CUSTOM' }), custom).taxName).toBe('Levy');
  });

  it('derives overdue and never stores it', () => {
    expect(displayStatus(invoice(), '2026-10-17')).toBe('overdue');
    expect(displayStatus(invoice(), '2026-10-16')).toBe('unpaid');
    expect(displayStatus(invoice({ status: InvoiceStatus.Paid }), '2027-01-01')).toBe('paid');
    expect(displayStatus(invoice({ status: InvoiceStatus.Draft }), '2027-01-01')).toBe('draft');
  });

  it('converts to home currency with the invoice rate', () => {
    expect(toHomeCurrency(100, { exchangeRate: 83.25 })).toBe(8325);
    expect(toHomeCurrency(100, { exchangeRate: 0 })).toBe(100);
  });

  it('uses the regime locale for its own currency and en-US for a foreign one', () => {
    expect(invoiceLocale(getRegime('IN'), 'INR')).toBe('en-IN');
    expect(invoiceLocale(getRegime('IN'), 'USD')).toBe('en-US');
  });
});
