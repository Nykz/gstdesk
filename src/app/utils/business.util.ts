import { Business } from '../interfaces/business.interface';
import { getRegime } from './tax-regimes';

/** A blank business set up for a country: currency, region, rate and bank labels follow the regime. */
export function defaultBusiness(regimeCode = 'IN'): Business {
  const regime = getRegime(regimeCode);
  return {
    name: '',
    country: regime.code,
    currency: regime.currency,
    taxId: '',
    regionCode: regime.defaultRegion,
    customTaxName: '',
    defaultTaxRate: regime.defaultRate,
    address: '',
    email: '',
    phone: '',
    invoicePrefix: 'INV',
    bankName: '',
    accountNumber: '',
    bankCode: '',
    paymentId: '',
  };
}

/** Changing the country resets everything that only makes sense inside the old country. */
export function switchCountry(business: Business, regimeCode: string): Business {
  const fresh = defaultBusiness(regimeCode);
  return {
    ...business,
    country: fresh.country,
    currency: fresh.currency,
    regionCode: fresh.regionCode,
    defaultTaxRate: fresh.defaultTaxRate,
    taxId: '',
    bankCode: '',
    paymentId: '',
  };
}
