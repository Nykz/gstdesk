import { defaultBusiness, switchCountry } from './business.util';

describe('business.util', () => {
  it('defaults to India', () => {
    const business = defaultBusiness();
    expect(business.country).toBe('IN');
    expect(business.currency).toBe('INR');
    expect(business.regionCode).toBe('27');
    expect(business.defaultTaxRate).toBe(18);
    expect(business.invoicePrefix).toBe('INV');
  });

  it('follows the regime', () => {
    expect(defaultBusiness('GB')).toMatchObject({ currency: 'GBP', regionCode: '', defaultTaxRate: 20 });
    expect(defaultBusiness('US')).toMatchObject({ currency: 'USD', regionCode: 'CA', defaultTaxRate: 0 });
  });

  it('switching country resets currency, region, rate, tax ID and bank codes but keeps the rest', () => {
    const base = {
      ...defaultBusiness('IN'),
      name: 'Acme',
      taxId: '27X',
      bankCode: 'HDFC0001',
      paymentId: 'a@b',
      address: 'Pune',
    };
    const next = switchCountry(base, 'AU');
    expect(next).toMatchObject({
      name: 'Acme',
      address: 'Pune',
      country: 'AU',
      currency: 'AUD',
      regionCode: '',
      defaultTaxRate: 10,
      taxId: '',
      bankCode: '',
      paymentId: '',
    });
  });
});
