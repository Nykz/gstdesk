export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  ['AE', 'United Arab Emirates'], ['AT', 'Austria'], ['AU', 'Australia'], ['BE', 'Belgium'],
  ['BR', 'Brazil'], ['CA', 'Canada'], ['CH', 'Switzerland'], ['CN', 'China'], ['DE', 'Germany'],
  ['DK', 'Denmark'], ['ES', 'Spain'], ['FI', 'Finland'], ['FR', 'France'], ['GB', 'United Kingdom'],
  ['GR', 'Greece'], ['HK', 'Hong Kong'], ['IE', 'Ireland'], ['IN', 'India'], ['IT', 'Italy'],
  ['JP', 'Japan'], ['KR', 'South Korea'], ['LU', 'Luxembourg'], ['MY', 'Malaysia'], ['NL', 'Netherlands'],
  ['NO', 'Norway'], ['NZ', 'New Zealand'], ['PL', 'Poland'], ['PT', 'Portugal'], ['QA', 'Qatar'],
  ['SA', 'Saudi Arabia'], ['SE', 'Sweden'], ['SG', 'Singapore'], ['US', 'United States'],
  ['ZA', 'South Africa'],
].map(([code, name]) => ({ code, name }));

export const CURRENCIES: string[] = [
  'INR', 'USD', 'GBP', 'EUR', 'AUD', 'SGD', 'AED', 'CAD', 'NZD', 'CHF', 'JPY', 'ZAR',
];

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

const EURO_COUNTRIES = ['AT', 'BE', 'DE', 'ES', 'FI', 'FR', 'GR', 'IE', 'IT', 'LU', 'NL', 'PT'];

const COUNTRY_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD', SG: 'SGD', AE: 'AED', CA: 'CAD', NZ: 'NZD', CH: 'CHF',
  JP: 'JPY', ZA: 'ZAR', ...Object.fromEntries(EURO_COUNTRIES.map((code) => [code, 'EUR'])),
};

/** The currency a customer in this country would normally be billed in, when we offer it. */
export function currencyForCountry(code: string): string | undefined {
  return COUNTRY_CURRENCY[code];
}
