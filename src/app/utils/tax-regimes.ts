import { TaxEngine } from '../enums/tax-engine.enum';
import { TaxRegime } from '../interfaces/tax-regime.interface';
import { INDIA_STATES, US_STATES } from './regions';

const NO_REGIONS = { regionLabel: '', regions: [], defaultRegion: '' };

const SINGLE_RATE_DEFAULTS = {
  engine: TaxEngine.SingleRate,
  splitLabels: [] as string[],
  interLabel: '',
  roundToWhole: false,
  fiscalYearStartMonth: 1,
  itemCodeLabel: 'Item code',
  ...NO_REGIONS,
};

export const EU_DOMESTIC_COUNTRIES = [
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR', 'LU', 'PL',
];

export const TAX_REGIMES: TaxRegime[] = [
  {
    code: 'IN',
    name: 'India (GST)',
    defaultCountry: 'IN',
    domesticCountries: ['IN'],
    currency: 'INR',
    locale: 'en-IN',
    engine: TaxEngine.SplitByRegion,
    taxName: 'GST',
    taxIdLabel: 'GSTIN',
    taxIdPlaceholder: '27AABCU9603R1ZX',
    itemCodeLabel: 'HSN/SAC',
    documentTitle: 'TAX INVOICE',
    rates: [0, 5, 12, 18, 28],
    defaultRate: 18,
    splitLabels: ['CGST', 'SGST'],
    interLabel: 'IGST',
    regionLabel: 'State',
    regions: INDIA_STATES,
    defaultRegion: '27',
    roundToWhole: true,
    fiscalYearStartMonth: 4,
    bankCodeLabel: 'IFSC',
    paymentIdLabel: 'UPI ID',
    paymentIdPlaceholder: 'name@bank',
    exemptLabel: 'Export under LUT (zero-rated)',
    exemptNote:
      'Supply meant for export under Letter of Undertaking (LUT) without payment of integrated tax.',
  },
  {
    code: 'US',
    name: 'United States (Sales tax)',
    defaultCountry: 'US',
    domesticCountries: ['US'],
    currency: 'USD',
    locale: 'en-US',
    engine: TaxEngine.ManualRate,
    taxName: 'Sales tax',
    taxIdLabel: 'EIN / Tax ID',
    taxIdPlaceholder: '12-3456789',
    itemCodeLabel: 'SKU',
    documentTitle: 'INVOICE',
    rates: [],
    defaultRate: 0,
    splitLabels: [],
    interLabel: '',
    regionLabel: 'State',
    regions: US_STATES,
    defaultRegion: 'CA',
    roundToWhole: false,
    fiscalYearStartMonth: 1,
    bankCodeLabel: 'Routing number',
    paymentIdLabel: 'Payment email',
    paymentIdPlaceholder: 'pay@example.com',
    exemptLabel: 'No sales tax (out of state / exempt)',
    exemptNote: 'No sales tax charged: exempt or out-of-state supply.',
  },
  {
    ...SINGLE_RATE_DEFAULTS,
    code: 'GB',
    name: 'United Kingdom (VAT)',
    defaultCountry: 'GB',
    domesticCountries: ['GB'],
    currency: 'GBP',
    locale: 'en-GB',
    taxName: 'VAT',
    taxIdLabel: 'VAT number',
    taxIdPlaceholder: 'GB123456789',
    documentTitle: 'VAT INVOICE',
    rates: [0, 5, 20],
    defaultRate: 20,
    fiscalYearStartMonth: 4,
    bankCodeLabel: 'Sort code',
    paymentIdLabel: 'Payment reference',
    paymentIdPlaceholder: 'Reference',
    exemptLabel: 'Outside the scope of VAT (export)',
    exemptNote: 'Zero-rated export: outside the scope of UK VAT.',
  },
  {
    ...SINGLE_RATE_DEFAULTS,
    code: 'EU',
    name: 'European Union (VAT)',
    defaultCountry: 'DE',
    domesticCountries: EU_DOMESTIC_COUNTRIES,
    currency: 'EUR',
    locale: 'en-IE',
    taxName: 'VAT',
    taxIdLabel: 'VAT ID',
    taxIdPlaceholder: 'DE123456789',
    documentTitle: 'INVOICE',
    rates: [0, 5, 7, 10, 19, 20, 21, 23],
    defaultRate: 19,
    bankCodeLabel: 'BIC / SWIFT',
    paymentIdLabel: 'IBAN',
    paymentIdPlaceholder: 'DE89 3704 0044 0532 0130 00',
    exemptLabel: 'VAT exempt (export / reverse charge)',
    exemptNote: 'VAT exempt: export or reverse charge applies.',
  },
  {
    ...SINGLE_RATE_DEFAULTS,
    code: 'AU',
    name: 'Australia (GST)',
    defaultCountry: 'AU',
    domesticCountries: ['AU'],
    currency: 'AUD',
    locale: 'en-AU',
    taxName: 'GST',
    taxIdLabel: 'ABN',
    taxIdPlaceholder: '51 824 753 556',
    documentTitle: 'TAX INVOICE',
    rates: [0, 10],
    defaultRate: 10,
    fiscalYearStartMonth: 7,
    bankCodeLabel: 'BSB',
    paymentIdLabel: 'PayID',
    paymentIdPlaceholder: 'name@example.com',
    exemptLabel: 'GST-free (export)',
    exemptNote: 'GST-free supply: export of goods or services.',
  },
  {
    ...SINGLE_RATE_DEFAULTS,
    code: 'SG',
    name: 'Singapore (GST)',
    defaultCountry: 'SG',
    domesticCountries: ['SG'],
    currency: 'SGD',
    locale: 'en-SG',
    taxName: 'GST',
    taxIdLabel: 'GST reg. no.',
    taxIdPlaceholder: 'M12345678X',
    documentTitle: 'TAX INVOICE',
    rates: [0, 9],
    defaultRate: 9,
    bankCodeLabel: 'Bank code',
    paymentIdLabel: 'PayNow',
    paymentIdPlaceholder: 'Mobile or UEN',
    exemptLabel: 'Zero-rated (international services)',
    exemptNote: 'Zero-rated supply: international service or export.',
  },
  {
    ...SINGLE_RATE_DEFAULTS,
    code: 'AE',
    name: 'United Arab Emirates (VAT)',
    defaultCountry: 'AE',
    domesticCountries: ['AE'],
    currency: 'AED',
    locale: 'en-AE',
    taxName: 'VAT',
    taxIdLabel: 'TRN',
    taxIdPlaceholder: '100123456789003',
    documentTitle: 'TAX INVOICE',
    rates: [0, 5],
    defaultRate: 5,
    bankCodeLabel: 'SWIFT',
    paymentIdLabel: 'IBAN',
    paymentIdPlaceholder: 'AE07 0331 2345 6789 0123 456',
    exemptLabel: 'Zero-rated (export)',
    exemptNote: 'Zero-rated supply: export outside the UAE.',
  },
  {
    code: 'CUSTOM',
    name: 'Other country (custom tax)',
    defaultCountry: 'US',
    domesticCountries: [],
    currency: 'USD',
    locale: 'en-US',
    engine: TaxEngine.ManualRate,
    taxName: 'Tax',
    taxIdLabel: 'Tax ID',
    taxIdPlaceholder: 'Tax registration number',
    itemCodeLabel: 'Item code',
    documentTitle: 'INVOICE',
    rates: [],
    defaultRate: 0,
    splitLabels: [],
    interLabel: '',
    regionLabel: '',
    regions: [],
    defaultRegion: '',
    roundToWhole: false,
    fiscalYearStartMonth: 1,
    bankCodeLabel: 'Bank code',
    paymentIdLabel: 'Payment ID',
    paymentIdPlaceholder: 'Payment ID',
    exemptLabel: 'No tax',
    exemptNote: 'No tax charged on this invoice.',
  },
];

export const DEFAULT_REGIME_CODE = 'IN';

/** Looks a regime up by code; unknown codes fall back to India (the original default). */
export function getRegime(code: string | undefined | null): TaxRegime {
  return (
    TAX_REGIMES.find((regime) => regime.code === code) ??
    TAX_REGIMES.find((regime) => regime.code === DEFAULT_REGIME_CODE)!
  );
}

/** Same regime with the tax name replaced by the user's own for the CUSTOM regime. */
export function withCustomTaxName(regime: TaxRegime, customTaxName: string): TaxRegime {
  const name = customTaxName.trim();
  return regime.code === 'CUSTOM' && name ? { ...regime, taxName: name } : regime;
}

export function regionName(regime: TaxRegime, code: string): string {
  return regime.regions.find((region) => region.code === code)?.name ?? code;
}

export function isDomesticCountry(regime: TaxRegime, country: string): boolean {
  return regime.domesticCountries.includes(country);
}

export function hasRegions(regime: TaxRegime): boolean {
  return regime.regions.length > 0;
}
