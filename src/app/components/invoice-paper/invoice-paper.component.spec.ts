import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { Business } from '../../interfaces/business.interface';
import { Customer } from '../../interfaces/customer.interface';
import { Invoice } from '../../interfaces/invoice.interface';
import { defaultBusiness } from '../../utils/business.util';
import { buildGstin } from '../../utils/gstin.util';
import { InvoicePaperComponent } from './invoice-paper.component';

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'c1', name: 'Kalpataru Retail', taxId: '', country: 'IN', regionCode: '27',
  email: '', phone: '', address: 'Mumbai', ...overrides,
});

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'i1', number: 'INV/26-27/001', customerId: 'c1', issueDate: '2026-10-01', dueDate: '2026-10-16',
  status: InvoiceStatus.Unpaid, regime: 'IN', currency: 'INR', exchangeRate: 1,
  taxTreatment: TaxTreatment.Standard,
  items: [{ id: 'a', description: 'Web design', itemCode: '998314', quantity: 1, rate: 10000, taxRate: 18 }],
  notes: '', sellerRegionCode: '27', ...overrides,
});

describe('InvoicePaperComponent', () => {
  let fixture: ComponentFixture<InvoicePaperComponent>;

  const render = async (inv: Invoice, business: Business, cust: Customer | undefined) => {
    fixture.componentRef.setInput('invoice', inv);
    fixture.componentRef.setInput('business', business);
    fixture.componentRef.setInput('customer', cust);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoicePaperComponent);
  });

  describe('India', () => {
    const business: Business = {
      ...defaultBusiness('IN'), name: 'Aarav Digital Studio', taxId: buildGstin('27', 'AAQPA4821K'),
      address: 'Pune', bankName: 'HDFC', accountNumber: '123', bankCode: 'HDFC0000123', paymentId: 'a@upi',
    };

    it('same state: TAX INVOICE with CGST + SGST, place of supply and GSTIN', async () => {
      const el = await render(invoice(), business, customer({ taxId: buildGstin('27', 'AABCK1234F') }));
      const text = el.textContent!;
      expect(text).toContain('TAX INVOICE');
      expect(text).toContain('GSTIN:');
      expect(text).toContain('CGST');
      expect(text).toContain('SGST');
      expect(text).not.toContain('IGST');
      expect(text).toContain('Place of supply: Maharashtra (27)');
      expect(text).toContain('HSN/SAC');
      expect(text).toContain('₹11,800.00');
      expect(text).toContain('Rupees Eleven Thousand Eight Hundred Only');
      expect(text).toContain('IFSC: HDFC0000123');
      expect(text).toContain('UPI ID: a@upi');
      expect(text).toContain('computer-generated');
      expect(text).not.toContain('Round off');
    });

    it('other state: IGST only', async () => {
      const el = await render(invoice(), business, customer({ regionCode: '29' }));
      expect(el.textContent).toContain('IGST');
      expect(el.textContent).not.toContain('CGST');
      expect(el.textContent).toContain('Place of supply: Karnataka (29)');
    });

    it('rounds to a whole rupee and prints the round-off', async () => {
      const inv = invoice({
        items: [{ id: 'a', description: 'X', itemCode: '', quantity: 3, rate: 33.33, taxRate: 18 }],
      });
      const el = await render(inv, business, customer({ regionCode: '29' }));
      expect(el.textContent).toContain('Round off');
      expect(el.textContent).toContain('₹118.00');
    });

    it('export in USD: no tax, no round-off, LUT note, exchange rate', async () => {
      const inv = invoice({
        currency: 'USD', exchangeRate: 83.5, taxTreatment: TaxTreatment.Exempt,
        items: [{ id: 'a', description: 'Dev', itemCode: '', quantity: 1, rate: 1234.56, taxRate: 18 }],
      });
      const el = await render(inv, business, customer({ country: 'US', regionCode: '', name: 'Acme Inc' }));
      const text = el.textContent!;
      expect(text).toContain('Letter of Undertaking (LUT)');
      expect(text).toContain('$1,234.56');
      expect(text).not.toContain('CGST');
      expect(text).not.toContain('IGST');
      expect(text).not.toContain('Round off');
      expect(text).not.toContain('HSN/SAC');
      expect(text).toContain('Exchange rate: 1 USD = ₹83.50');
      expect(text).toContain('Supply to: United States');
      expect(text).toContain('US Dollars One Thousand Two Hundred Thirty-Four and Fifty-Six Cents Only');
      expect(el.querySelector('.tax-summary')).toBeNull();
    });

    it('shows a small exchange rate in full', async () => {
      const inv = invoice({ currency: 'INR', exchangeRate: 0.010513, taxTreatment: TaxTreatment.Exempt });
      const usBusiness = { ...business, country: 'US', currency: 'USD' };
      const el = await render(inv, usBusiness, customer({ country: 'IN', regionCode: '' }));
      expect(el.textContent).toContain('Exchange rate: 1 INR = $0.010513');
    });

    it('shows the PAID stamp and unregistered customers', async () => {
      const el = await render(invoice({ status: InvoiceStatus.Paid }), business, customer());
      expect(el.querySelector('.stamp')?.textContent).toContain('PAID');
      expect(el.textContent).toContain('Unregistered');
    });

    it('hides the item-code column when no item has a code', async () => {
      const inv = invoice({ items: [{ id: 'a', description: 'X', itemCode: '', quantity: 1, rate: 1, taxRate: 0 }] });
      const el = await render(inv, business, customer());
      expect(el.textContent).not.toContain('HSN/SAC');
    });

    it('prompts for a customer when none is chosen', async () => {
      const el = await render(invoice(), business, undefined);
      expect(el.textContent).toContain('Choose a customer');
    });
  });

  describe('United States', () => {
    const business: Business = { ...defaultBusiness('US'), name: 'Pixel Co', taxId: '12-3456789' };

    it('INVOICE with a single sales tax line and EIN label', async () => {
      const inv = invoice({
        regime: 'US', currency: 'USD', sellerRegionCode: 'CA',
        items: [{ id: 'a', description: 'Design', itemCode: '', quantity: 2, rate: 500, taxRate: 8.25 }],
      });
      const el = await render(inv, business, customer({ country: 'US', regionCode: 'TX', taxId: '98-7654321' }));
      const text = el.textContent!;
      expect(text).toContain('INVOICE');
      expect(text).not.toContain('TAX INVOICE');
      expect(text).toContain('EIN / Tax ID:');
      expect(text).toContain('Sales tax');
      expect(text).toContain('$82.50');
      expect(text).toContain('$1,082.50');
      expect(text).toContain('Supply to: Texas, United States');
      expect(text).not.toContain('GSTIN');
      expect(text).not.toContain('₹');
    });
  });

  describe('United Kingdom', () => {
    const business: Business = { ...defaultBusiness('GB'), name: 'Thames Ltd', taxId: 'GB123456789' };

    it('VAT INVOICE with VAT at 20% and a per-rate summary', async () => {
      const inv = invoice({
        regime: 'GB', currency: 'GBP', sellerRegionCode: '',
        items: [{ id: 'a', description: 'Consulting', itemCode: '', quantity: 1, rate: 1000, taxRate: 20 }],
      });
      const el = await render(inv, business, customer({ country: 'GB', regionCode: '', name: 'Cotswold Ltd' }));
      const text = el.textContent!;
      expect(text).toContain('VAT INVOICE');
      expect(text).toContain('VAT number:');
      expect(text).toContain('£200.00');
      expect(text).toContain('£1,200.00');
      expect(text).toContain('Pounds One Thousand Two Hundred Only');
      expect(el.querySelector('.tax-summary')).not.toBeNull();
      expect(text).not.toContain('Round off');
    });
  });
});
