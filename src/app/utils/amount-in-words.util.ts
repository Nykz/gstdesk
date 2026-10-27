import { round2 } from './money.util';

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

interface CurrencyWords {
  major: string;
  minor: string;
}

const CURRENCY_WORDS: Record<string, CurrencyWords> = {
  INR: { major: 'Rupees', minor: 'Paise' },
  USD: { major: 'US Dollars', minor: 'Cents' },
  GBP: { major: 'Pounds', minor: 'Pence' },
  EUR: { major: 'Euros', minor: 'Cents' },
  AUD: { major: 'Australian Dollars', minor: 'Cents' },
  SGD: { major: 'Singapore Dollars', minor: 'Cents' },
  AED: { major: 'Dirhams', minor: 'Fils' },
  CAD: { major: 'Canadian Dollars', minor: 'Cents' },
  NZD: { major: 'New Zealand Dollars', minor: 'Cents' },
  CHF: { major: 'Swiss Francs', minor: 'Rappen' },
  ZAR: { major: 'Rand', minor: 'Cents' },
  JPY: { major: 'Yen', minor: 'Sen' },
};

function below1000(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else {
      const ones = rest % 10;
      parts.push(ones ? `${TENS[Math.floor(rest / 10)]}-${ONES[ones]}` : TENS[Math.floor(rest / 10)]);
    }
  }
  return parts.join(' ');
}

function westernWords(n: number): string {
  if (n === 0) return ONES[0];
  const units: [number, string][] = [
    [1e9, 'Billion'],
    [1e6, 'Million'],
    [1e3, 'Thousand'],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of units) {
    const count = Math.floor(rest / size);
    if (count) parts.push(`${below1000(count)} ${name}`);
    rest %= size;
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

function indianWords(n: number): string {
  if (n === 0) return ONES[0];
  const units: [number, string][] = [
    [1e7, 'Crore'],
    [1e5, 'Lakh'],
    [1e3, 'Thousand'],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of units) {
    const count = Math.floor(rest / size);
    if (count) parts.push(`${count >= 100 ? indianWords(count) : below1000(count)} ${name}`);
    rest %= size;
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

export function amountInWords(value: number, currency: string): string {
  const words = CURRENCY_WORDS[currency] ?? { major: currency, minor: 'Minor units' };
  const abs = Math.abs(round2(value));
  const major = Math.floor(abs);
  const minor = Math.round((abs - major) * 100);
  const toWords = currency === 'INR' ? indianWords : westernWords;
  const sign = value < 0 ? 'Minus ' : '';
  let text = `${sign}${words.major} ${toWords(major)}`;
  if (minor) text += ` and ${toWords(minor)} ${words.minor}`;
  return `${text} Only`;
}
