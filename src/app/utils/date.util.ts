export interface IsoParts {
  year: number;
  month: number;
  day: number;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function parseIso(iso: string): IsoParts {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function toIso(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function todayIso(now = new Date()): string {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseIso(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseIso(iso);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseIso(iso);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return toIso(nextYear, nextMonth, Math.min(day, lastDay));
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  const a = parseIso(fromIso);
  const b = parseIso(toIsoDate);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** The calendar year in which the fiscal year containing `iso` starts. */
export function fiscalYearStart(iso: string, startMonth: number): number {
  const { year, month } = parseIso(iso);
  return month >= startMonth ? year : year - 1;
}

/** "26-27" for a split fiscal year, "2026" for a calendar year. */
export function fiscalYearLabel(iso: string, startMonth: number): string {
  const start = fiscalYearStart(iso, startMonth);
  if (startMonth === 1) return String(start);
  return `${pad(start % 100)}-${pad((start + 1) % 100)}`;
}

export function fiscalYearRange(iso: string, startMonth: number): { from: string; to: string } {
  const start = fiscalYearStart(iso, startMonth);
  const from = toIso(start, startMonth, 1);
  return { from, to: addDays(addMonths(from, 12), -1) };
}

export function isOverdue(dueDate: string, today: string): boolean {
  return dueDate < today;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthShortName(month: number): string {
  return MONTHS[month - 1];
}

/** "27 Oct 2026" */
export function formatDisplayDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const { year, month, day } = parseIso(iso);
  return `${pad(day)} ${monthShortName(month)} ${year}`;
}
