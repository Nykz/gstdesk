import {
  formatAmount,
  formatMoney,
  formatMoneyCompact,
  formatMoneyWhole,
  formatRate,
  round2,
} from './money.util';

describe('money.util', () => {
  it('formatRate keeps the detail of small and large rates', () => {
    expect(formatRate(83.5, 'INR', 'en-IN')).toBe('₹83.50');
    expect(formatRate(0.010513, 'USD', 'en-US')).toBe('$0.010513');
    expect(formatRate(1.2745, 'USD', 'en-US')).toBe('$1.2745');
  });

  it('round2 handles binary floating point edge cases', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(10)).toBe(10);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('formats rupees with Indian grouping', () => {
    expect(formatMoney(1234567.5, 'INR', 'en-IN')).toBe('₹12,34,567.50');
    expect(formatMoneyWhole(1234567.5, 'INR', 'en-IN')).toMatch(/^₹12,34,56[78]$/);
  });

  it('formats dollars and amounts', () => {
    expect(formatMoney(1234.5, 'USD', 'en-US')).toBe('$1,234.50');
    expect(formatAmount(1234.5, 'en-US')).toBe('1,234.50');
  });

  it('reuses cached formatters', () => {
    expect(formatMoney(1, 'USD', 'en-US')).toBe(formatMoney(1, 'USD', 'en-US'));
  });

  it('compacts rupees to K, L and Cr', () => {
    expect(formatMoneyCompact(950, 'INR', 'en-IN')).toBe('₹950');
    expect(formatMoneyCompact(12000, 'INR', 'en-IN')).toBe('₹12K');
    expect(formatMoneyCompact(250000, 'INR', 'en-IN')).toBe('₹2.5L');
    expect(formatMoneyCompact(32000000, 'INR', 'en-IN')).toBe('₹3.2Cr');
    expect(formatMoneyCompact(-250000, 'INR', 'en-IN')).toBe('-₹2.5L');
  });

  it('compacts other currencies through Intl', () => {
    expect(formatMoneyCompact(2500000, 'USD', 'en-US')).toBe('$2.5M');
  });
});
