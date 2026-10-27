import { TaxTreatment } from '../enums/tax-treatment.enum';
import { InvoiceItem } from '../interfaces/invoice.interface';
import { calcTotals, buildTaxContext, lineTaxParts, summarizeByRate } from './tax-engine.util';
import { getRegime, withCustomTaxName } from './tax-regimes';

const item = (quantity: number, rate: number, taxRate: number, id = 'i'): InvoiceItem => ({
  id,
  description: 'Work',
  itemCode: '',
  quantity,
  rate,
  taxRate,
});

const ctx = (code: string, sameRegion: boolean, treatment = TaxTreatment.Standard, currency?: string) => {
  const regime = getRegime(code);
  return buildTaxContext(regime, { sameRegion, treatment, invoiceCurrency: currency ?? regime.currency });
};

describe('tax-engine', () => {
  describe('India split-by-region', () => {
    it('same state: CGST + SGST', () => {
      const totals = calcTotals([item(1, 1000, 18)], ctx('IN', true));
      expect(totals.subtotal).toBe(1000);
      expect(totals.taxLines).toEqual([
        { key: 'CGST', label: 'CGST', amount: 90 },
        { key: 'SGST', label: 'SGST', amount: 90 },
      ]);
      expect(totals.totalTax).toBe(180);
      expect(totals.grandTotal).toBe(1180);
      expect(totals.roundOff).toBe(0);
    });

    it('other state: a single IGST part', () => {
      const totals = calcTotals([item(1, 1000, 18)], ctx('IN', false));
      expect(totals.taxLines).toEqual([{ key: 'IGST', label: 'IGST', amount: 180 }]);
    });

    it('odd paisa goes to the last part', () => {
      const parts = lineTaxParts(1, 5, ctx('IN', true)); // tax 0.05
      expect(parts.map((p) => p.amount)).toEqual([0.02, 0.03]);
      expect(parts[0].amount + parts[1].amount).toBeCloseTo(0.05, 10);
    });

    it('rounds the grand total to a whole rupee and reports the round-off', () => {
      const totals = calcTotals([item(3, 33.33, 18)], ctx('IN', false));
      // 99.99 + 18.00 (17.9982 -> 18.00) = 117.99
      expect(totals.exactTotal).toBe(117.99);
      expect(totals.grandTotal).toBe(118);
      expect(totals.roundOff).toBe(0.01);
    });

    it('computes tax line by line, then sums', () => {
      const items = [item(1, 0.5, 5, 'a'), item(1, 0.5, 5, 'b')];
      const totals = calcTotals(items, ctx('IN', false));
      // each line: 0.025 -> 0.03; summed 0.06 (a single 1.00 * 5% would be 0.05)
      expect(totals.totalTax).toBe(0.06);
    });
  });

  describe('exempt treatment', () => {
    it('charges no tax and does not round off', () => {
      const totals = calcTotals([item(2, 500.5, 18)], ctx('IN', false, TaxTreatment.Exempt, 'USD'));
      expect(totals.taxLines).toEqual([]);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(1001);
      expect(totals.roundOff).toBe(0);
    });
  });

  describe('roundWhole', () => {
    it('is true only for a rounding regime billed in its own currency', () => {
      expect(ctx('IN', true).roundWhole).toBe(true);
      expect(ctx('IN', true, TaxTreatment.Standard, 'USD').roundWhole).toBe(false);
      expect(ctx('GB', true).roundWhole).toBe(false);
    });

    it('does not round an Indian export billed in USD to a whole dollar', () => {
      const totals = calcTotals(
        [item(1, 1234.56, 0)],
        ctx('IN', false, TaxTreatment.Exempt, 'USD'),
      );
      expect(totals.grandTotal).toBe(1234.56);
      expect(totals.roundOff).toBe(0);
    });
  });

  describe('single-rate (VAT) and manual-rate engines', () => {
    it('UK VAT is one labelled part', () => {
      const totals = calcTotals([item(2, 100, 20)], ctx('GB', true));
      expect(totals.taxLines).toEqual([{ key: 'VAT', label: 'VAT', amount: 40 }]);
      expect(totals.grandTotal).toBe(240);
    });

    it('US sales tax uses the typed rate per line', () => {
      const totals = calcTotals([item(1, 100, 8.25, 'a'), item(1, 50, 0, 'b')], ctx('US', true));
      expect(totals.taxLines).toEqual([{ key: 'Sales tax', label: 'Sales tax', amount: 8.25 }]);
      expect(totals.grandTotal).toBe(158.25);
    });

    it('CUSTOM uses the user-named tax', () => {
      const regime = withCustomTaxName(getRegime('CUSTOM'), 'Service Levy');
      const context = buildTaxContext(regime, {
        sameRegion: true,
        treatment: TaxTreatment.Standard,
        invoiceCurrency: 'USD',
      });
      expect(calcTotals([item(1, 100, 5)], context).taxLines[0].label).toBe('Service Levy');
    });

    it('zero-rated invoices have no tax lines', () => {
      expect(calcTotals([item(1, 100, 0)], ctx('GB', true)).taxLines).toEqual([]);
    });
  });

  describe('summarizeByRate', () => {
    it('groups lines by rate in ascending order', () => {
      const rows = summarizeByRate(
        [item(1, 100, 18, 'a'), item(1, 200, 5, 'b'), item(1, 100, 18, 'c')],
        ctx('IN', true),
      );
      expect(rows.map((r) => r.rate)).toEqual([5, 18]);
      expect(rows[1].taxable).toBe(200);
      expect(rows[1].totalTax).toBe(36);
      expect(rows[1].taxLines.map((l) => l.label)).toEqual(['CGST', 'SGST']);
    });

    it('exempt gives one untaxed row; empty gives none', () => {
      const exempt = ctx('IN', false, TaxTreatment.Exempt);
      expect(summarizeByRate([item(1, 100, 18)], exempt)).toEqual([
        { rate: 0, taxable: 100, taxLines: [], totalTax: 0 },
      ]);
      expect(summarizeByRate([], exempt)).toEqual([]);
    });
  });

  it('treats blank numbers as zero', () => {
    const totals = calcTotals([item(NaN, 10, 18)], ctx('GB', true));
    expect(totals.subtotal).toBe(0);
  });
});
