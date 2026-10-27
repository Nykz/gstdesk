import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import {
  migrateBackup,
  migrateBusiness,
  migrateCustomer,
  migrateCustomers,
  migrateInvoice,
  migrateInvoices,
} from './migrate.util';

describe('migrate.util', () => {
  it('upgrades old India-only business names', () => {
    const business = migrateBusiness({
      name: 'Old Co',
      gstin: '27AAPFU0939F1ZV',
      stateCode: '27',
      ifsc: 'HDFC0001234',
      upiId: 'old@upi',
      invoicePrefix: 'OLD',
    });
    expect(business).toMatchObject({
      name: 'Old Co',
      country: 'IN',
      currency: 'INR',
      taxId: '27AAPFU0939F1ZV',
      regionCode: '27',
      bankCode: 'HDFC0001234',
      paymentId: 'old@upi',
      invoicePrefix: 'OLD',
    });
  });

  it('keeps new names and fills defaults for junk', () => {
    expect(migrateBusiness({ country: 'GB', taxId: 'GB1234', currency: 'GBP' })).toMatchObject({
      country: 'GB',
      taxId: 'GB1234',
      defaultTaxRate: 20,
    });
    expect(migrateBusiness(null).country).toBe('IN');
    expect(migrateBusiness('x').invoicePrefix).toBe('INV');
  });

  it('upgrades customers and drops records without an id', () => {
    expect(migrateCustomer({ id: 'c1', name: 'A', gstin: 'G', stateCode: '29' })).toMatchObject({
      id: 'c1',
      taxId: 'G',
      regionCode: '29',
      country: 'IN',
    });
    expect(migrateCustomer({ name: 'no id' })).toBeNull();
    expect(migrateCustomers([{ id: 'a' }, null, 5])).toHaveLength(1);
    expect(migrateCustomers('nope')).toEqual([]);
  });

  it('upgrades invoices: item names and the multi-country fields', () => {
    const invoice = migrateInvoice({
      id: 'i1',
      number: 'INV/26-27/001',
      customerId: 'c1',
      issueDate: '2026-05-01',
      dueDate: '2026-05-16',
      status: 'paid',
      items: [{ id: 'x', description: 'Dev', hsn: '9983', quantity: 2, rate: 100, gstRate: 18 }],
    });
    expect(invoice).toMatchObject({
      regime: 'IN',
      currency: 'INR',
      exchangeRate: 1,
      taxTreatment: TaxTreatment.Standard,
      status: InvoiceStatus.Paid,
    });
    expect(invoice?.items[0]).toMatchObject({ itemCode: '9983', taxRate: 18, quantity: 2 });
  });

  it('keeps exempt treatment, foreign currency and the seller region', () => {
    const invoice = migrateInvoice({
      id: 'i2',
      status: 'weird',
      regime: 'IN',
      currency: 'USD',
      exchangeRate: 83.5,
      taxTreatment: 'exempt',
      sellerRegionCode: '27',
      items: 'not an array',
    });
    expect(invoice).toMatchObject({
      status: InvoiceStatus.Draft,
      currency: 'USD',
      exchangeRate: 83.5,
      taxTreatment: TaxTreatment.Exempt,
      sellerRegionCode: '27',
      items: [],
    });
    expect(migrateInvoice({})).toBeNull();
    expect(migrateInvoices(undefined)).toEqual([]);
  });

  it('migrates a whole backup and rejects other files', () => {
    const backup = migrateBackup({
      version: 1,
      business: { name: 'B', gstin: 'G' },
      customers: [{ id: 'c' }],
      invoices: [{ id: 'i' }],
    });
    expect(backup.version).toBe(2);
    expect(backup.business.taxId).toBe('G');
    expect(backup.customers).toHaveLength(1);
    expect(() => migrateBackup({ hello: 1 })).toThrow('not a valid backup');
    expect(() => migrateBackup(null)).toThrow();
  });
});
