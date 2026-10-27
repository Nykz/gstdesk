import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { defaultBusiness } from './business.util';
import { validateInvoice } from './invoice-validation.util';

const customer: Customer = {
  id: 'c', name: 'C', taxId: '', country: 'IN', regionCode: '27', email: '', phone: '', address: '',
};
const business = { ...defaultBusiness('IN'), name: 'Biz' };
const valid = (): Invoice => ({
  id: 'i', number: 'INV/26-27/001', customerId: 'c', issueDate: '2026-10-01', dueDate: '2026-10-16',
  status: InvoiceStatus.Unpaid, regime: 'IN', currency: 'INR', exchangeRate: 1,
  taxTreatment: TaxTreatment.Standard,
  items: [{ id: 'a', description: 'Work', itemCode: '', quantity: 1, rate: 100, taxRate: 18 }],
  notes: '',
});

describe('validateInvoice', () => {
  it('passes a complete invoice', () => {
    expect(validateInvoice(valid(), business, customer)).toEqual([]);
  });

  it('needs a business name, a customer and items', () => {
    const fields = validateInvoice({ ...valid(), items: [] }, { ...business, name: ' ' }, undefined).map(
      (i) => i.field,
    );
    expect(fields).toEqual(['business', 'customer', 'items']);
  });

  it('checks the dates', () => {
    expect(validateInvoice({ ...valid(), issueDate: 'x' }, business, customer)[0].field).toBe('issueDate');
    expect(validateInvoice({ ...valid(), dueDate: '2026-09-01' }, business, customer)[0].message).toContain(
      'before',
    );
    expect(validateInvoice({ ...valid(), dueDate: '' }, business, customer)[0].field).toBe('dueDate');
  });

  it('requires an exchange rate for a foreign currency', () => {
    expect(
      validateInvoice({ ...valid(), currency: 'USD', exchangeRate: 0 }, business, customer)[0].field,
    ).toBe('exchangeRate');
    expect(validateInvoice({ ...valid(), currency: 'USD', exchangeRate: 83 }, business, customer)).toEqual([]);
  });

  it('checks every line item', () => {
    const invoice = valid();
    invoice.items = [{ id: 'a', description: ' ', itemCode: '', quantity: 0, rate: -1, taxRate: 120 }];
    expect(validateInvoice(invoice, business, customer).map((i) => i.field)).toEqual([
      'items.0.description',
      'items.0.quantity',
      'items.0.rate',
      'items.0.taxRate',
    ]);
  });
});
