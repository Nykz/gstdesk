import { nextInvoiceNumber } from './invoice-number.util';

describe('nextInvoiceNumber', () => {
  it('starts at 001 for an empty fiscal year', () => {
    expect(nextInvoiceNumber('INV', '2026-10-27', 4, [])).toBe('INV/26-27/001');
  });

  it('continues the sequence in the same fiscal year', () => {
    expect(nextInvoiceNumber('INV', '2026-10-27', 4, ['INV/26-27/001', 'INV/26-27/007'])).toBe(
      'INV/26-27/008',
    );
  });

  it('restarts in a new fiscal year', () => {
    expect(nextInvoiceNumber('INV', '2027-04-01', 4, ['INV/26-27/012'])).toBe('INV/27-28/001');
  });

  it('uses a calendar year when the year starts in January', () => {
    expect(nextInvoiceNumber('INV', '2026-12-31', 1, ['INV/2026/004'])).toBe('INV/2026/005');
  });

  it('ignores other prefixes and malformed numbers, and escapes the prefix', () => {
    expect(nextInvoiceNumber('A.B', '2026-05-01', 4, ['AXB/26-27/009', 'A.B/26-27/x', 'A.B/26-27/002'])).toBe(
      'A.B/26-27/003',
    );
  });
});
