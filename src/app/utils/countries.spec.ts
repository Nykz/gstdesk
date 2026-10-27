import { CURRENCIES, currencyForCountry } from './countries';

describe('currencyForCountry', () => {
  it.each([
    ['US', 'USD'],
    ['GB', 'GBP'],
    ['DE', 'EUR'],
    ['IN', 'INR'],
    ['AU', 'AUD'],
  ])('%s is billed in %s', (country, currency) => {
    expect(currencyForCountry(country)).toBe(currency);
  });

  it('has no suggestion for a country whose currency we do not offer', () => {
    expect(currencyForCountry('BR')).toBeUndefined();
  });

  it('only suggests currencies the invoice can use', () => {
    for (const country of ['US', 'GB', 'DE', 'IN', 'AU', 'SG', 'AE', 'CA', 'NZ', 'CH', 'JP', 'ZA']) {
      expect(CURRENCIES).toContain(currencyForCountry(country));
    }
  });
});
