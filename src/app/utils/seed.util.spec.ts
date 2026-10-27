import { InvoiceStatus } from '../enums/invoice-status.enum';
import { buildDemoData, createRandom } from './seed.util';
import { isValidGstin } from './gstin.util';
import { monthKey } from './date.util';

const TODAY = '2026-10-27';

describe('seed.util', () => {
  it('random is deterministic', () => {
    const a = createRandom(1);
    const b = createRandom(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('builds the same data every time', () => {
    expect(buildDemoData(TODAY)).toEqual(buildDemoData(TODAY));
  });

  it('seller is Aarav Digital Studio in Pune, Maharashtra, with a valid GSTIN', () => {
    const { business } = buildDemoData(TODAY);
    expect(business.name).toBe('Aarav Digital Studio');
    expect(business.address).toContain('Pune');
    expect(business.regionCode).toBe('27');
    expect(isValidGstin(business.taxId)).toBe(true);
  });

  it('has 8 Indian customers, one unregistered, with checksum-valid GSTINs', () => {
    const { customers } = buildDemoData(TODAY);
    expect(customers).toHaveLength(8);
    expect(customers.every((c) => c.country === 'IN')).toBe(true);
    expect(customers.filter((c) => !c.taxId)).toHaveLength(1);
    for (const c of customers.filter((x) => x.taxId)) {
      expect(isValidGstin(c.taxId)).toBe(true);
      expect(c.taxId.slice(0, 2)).toBe(c.regionCode);
    }
    expect(new Set(customers.map((c) => c.regionCode)).size).toBeGreaterThan(3);
  });

  it('has 3 to 5 invoices per past month and exactly one draft, dated today', () => {
    const { invoices } = buildDemoData(TODAY);
    const drafts = invoices.filter((i) => i.status === InvoiceStatus.Draft);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].issueDate).toBe(TODAY);
    const perMonth = new Map<string, number>();
    for (const i of invoices.filter((x) => x.status !== InvoiceStatus.Draft)) {
      perMonth.set(monthKey(i.issueDate), (perMonth.get(monthKey(i.issueDate)) ?? 0) + 1);
    }
    expect([...perMonth.keys()].sort()).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    for (const [key, count] of perMonth) {
      expect(count, key).toBeGreaterThanOrEqual(3);
      expect(count, key).toBeLessThanOrEqual(5);
    }
  });

  it('older invoices are almost all paid, recent ones are mixed', () => {
    const { invoices } = buildDemoData(TODAY);
    const old = invoices.filter((i) => i.issueDate < '2026-09-01' && i.status !== InvoiceStatus.Draft);
    const paidOld = old.filter((i) => i.status === InvoiceStatus.Paid).length;
    expect(paidOld / old.length).toBeGreaterThan(0.8);
    const recent = invoices.filter((i) => i.issueDate >= '2026-10-01' && i.status !== InvoiceStatus.Draft);
    expect(recent.some((i) => i.status === InvoiceStatus.Unpaid)).toBe(true);
  });

  it('numbers are unique and sequential per fiscal year', () => {
    const { invoices } = buildDemoData(TODAY);
    const numbers = invoices.map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[0]).toBe('INV/26-27/001');
    expect(numbers.every((n) => /^INV\/26-27\/\d{3}$/.test(n) || /^INV\/25-26\/\d{3}$/.test(n))).toBe(true);
  });

  it('works early in a month too', () => {
    const { invoices } = buildDemoData('2026-10-02');
    expect(invoices.filter((i) => i.status === InvoiceStatus.Draft)).toHaveLength(1);
    expect(invoices.length).toBeGreaterThan(10);
  });
});
