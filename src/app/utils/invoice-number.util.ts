import { fiscalYearLabel } from './date.util';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `<prefix>/<fiscal year>/<3-digit sequence>`, sequence restarting every fiscal year. */
export function nextInvoiceNumber(
  prefix: string,
  issueDate: string,
  fiscalYearStartMonth: number,
  existingNumbers: string[],
): string {
  const label = fiscalYearLabel(issueDate, fiscalYearStartMonth);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}/${escapeRegExp(label)}/(\\d+)$`);
  let highest = 0;
  for (const number of existingNumbers) {
    const match = pattern.exec(number);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}/${label}/${String(highest + 1).padStart(3, '0')}`;
}
