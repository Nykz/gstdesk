import { TAX_REGIMES } from './tax-regimes';

/** The tax regime that fits a device locale such as en-GB or de-DE; the custom regime when none does. */
export function guessRegime(locale: string | undefined | null): string {
  const region = (locale ?? '').split(/[-_]/)[1]?.toUpperCase();
  const match = region ? TAX_REGIMES.find((regime) => regime.domesticCountries.includes(region)) : undefined;
  return match?.code ?? 'CUSTOM';
}
