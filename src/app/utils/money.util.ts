export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const plainFormatters = new Map<string, Intl.NumberFormat>();
const compactFormatters = new Map<string, Intl.NumberFormat>();

function cached(
  cache: Map<string, Intl.NumberFormat>,
  key: string,
  create: () => Intl.NumberFormat,
): Intl.NumberFormat {
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = create();
    cache.set(key, formatter);
  }
  return formatter;
}

function currencyFormatter(currency: string, locale: string, digits: number): Intl.NumberFormat {
  return cached(
    currencyFormatters,
    `${locale}|${currency}|${digits}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
  );
}

/** Currency with two decimals, e.g. ₹1,234.50. */
export function formatMoney(value: number, currency: string, locale: string): string {
  return currencyFormatter(currency, locale, 2).format(value);
}

/** Currency with no decimals, for whole-unit totals. */
export function formatMoneyWhole(value: number, currency: string, locale: string): string {
  return currencyFormatter(currency, locale, 0).format(value);
}

/** An exchange rate keeps its detail: 1 USD = ₹83.50, but 1 INR = $0.010513 rather than $0.01. */
export function formatRate(value: number, currency: string, locale: string): string {
  return cached(
    currencyFormatters,
    `${locale}|${currency}|rate`,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }),
  ).format(value);
}

/** Number only, two decimals, no currency symbol. */
export function formatAmount(value: number, locale: string): string {
  return cached(
    plainFormatters,
    locale,
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ).format(value);
}

function trimmed(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** ₹2.5L, ₹3.2Cr, ₹12K for rupees; Intl compact notation for other currencies. */
export function formatMoneyCompact(value: number, currency: string, locale: string): string {
  if (currency === 'INR') {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs >= 1e7) return `${sign}₹${trimmed(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}₹${trimmed(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}₹${trimmed(abs / 1e3)}K`;
    return `${sign}₹${Math.round(abs)}`;
  }
  return cached(
    compactFormatters,
    `${locale}|${currency}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
  ).format(value);
}
