import {
  addDays,
  addMonths,
  daysBetween,
  fiscalYearLabel,
  fiscalYearRange,
  fiscalYearStart,
  formatDisplayDate,
  isIsoDate,
  isOverdue,
  monthKey,
  todayIso,
} from './date.util';

describe('date.util', () => {
  it('todayIso uses local calendar parts', () => {
    expect(todayIso(new Date(2026, 3, 5))).toBe('2026-04-05');
  });

  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('26-02-28')).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-25', 15)).toBe('2027-01-09');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months and clamps the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-16')).toBe(15);
  });

  it('April fiscal year (India, UK)', () => {
    expect(fiscalYearStart('2027-03-31', 4)).toBe(2026);
    expect(fiscalYearStart('2026-04-01', 4)).toBe(2026);
    expect(fiscalYearLabel('2026-10-27', 4)).toBe('26-27');
    expect(fiscalYearLabel('2027-02-01', 4)).toBe('26-27');
    expect(fiscalYearLabel('2099-05-01', 4)).toBe('99-00');
  });

  it('July fiscal year (Australia)', () => {
    expect(fiscalYearLabel('2026-06-30', 7)).toBe('25-26');
    expect(fiscalYearLabel('2026-07-01', 7)).toBe('26-27');
  });

  it('calendar fiscal year', () => {
    expect(fiscalYearLabel('2026-12-31', 1)).toBe('2026');
    expect(fiscalYearRange('2026-06-01', 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('fiscal year range', () => {
    expect(fiscalYearRange('2026-10-27', 4)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(fiscalYearRange('2026-02-01', 7)).toEqual({ from: '2025-07-01', to: '2026-06-30' });
  });

  it('overdue is strictly past due', () => {
    expect(isOverdue('2026-10-26', '2026-10-27')).toBe(true);
    expect(isOverdue('2026-10-27', '2026-10-27')).toBe(false);
  });

  it('month key and display date', () => {
    expect(monthKey('2026-10-27')).toBe('2026-10');
    expect(formatDisplayDate('2026-10-07')).toBe('07 Oct 2026');
    expect(formatDisplayDate('bad')).toBe('bad');
  });
});
