import { TaxEngine } from '../enums/tax-engine.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { InvoiceItem } from '../interfaces/invoice.interface';
import {
  InvoiceTotals,
  RateSummaryRow,
  TaxContext,
  TaxLine,
} from '../interfaces/tax.interface';
import { TaxRegime } from '../interfaces/tax-regime.interface';
import { round2 } from './money.util';

export function buildTaxContext(
  regime: TaxRegime,
  options: { sameRegion: boolean; treatment: TaxTreatment; invoiceCurrency: string },
): TaxContext {
  return {
    regime,
    sameRegion: options.sameRegion,
    treatment: options.treatment,
    roundWhole: regime.roundToWhole && options.invoiceCurrency === regime.currency,
  };
}

export function lineTaxable(item: Pick<InvoiceItem, 'quantity' | 'rate'>): number {
  return round2((Number(item.quantity) || 0) * (Number(item.rate) || 0));
}

/** Splits an amount into `parts` equal pieces; the last piece takes the odd paisa. */
function splitAmount(total: number, parts: number): number[] {
  const paise = Math.round(total * 100);
  const share = Math.floor(paise / parts);
  const pieces = Array<number>(parts).fill(share);
  pieces[parts - 1] = paise - share * (parts - 1);
  return pieces.map((p) => p / 100);
}

/** Tax parts for one line's taxable amount. */
export function lineTaxParts(taxable: number, rate: number, ctx: TaxContext): TaxLine[] {
  if (ctx.treatment === TaxTreatment.Exempt) return [];
  const { regime } = ctx;
  const total = round2((taxable * (Number(rate) || 0)) / 100);

  if (regime.engine === TaxEngine.SplitByRegion) {
    if (ctx.sameRegion) {
      const labels = regime.splitLabels;
      const amounts = splitAmount(total, labels.length);
      return labels.map((label, i) => ({ key: label, label, amount: amounts[i] }));
    }
    return [{ key: regime.interLabel, label: regime.interLabel, amount: total }];
  }
  return [{ key: regime.taxName, label: regime.taxName, amount: total }];
}

function mergeTaxLines(target: Map<string, TaxLine>, parts: TaxLine[]): void {
  for (const part of parts) {
    const existing = target.get(part.key);
    if (existing) existing.amount = round2(existing.amount + part.amount);
    else target.set(part.key, { ...part });
  }
}

/** Tax is computed line by line, then summed. */
export function calcTotals(items: InvoiceItem[], ctx: TaxContext): InvoiceTotals {
  let subtotal = 0;
  const merged = new Map<string, TaxLine>();
  for (const item of items) {
    const taxable = lineTaxable(item);
    subtotal = round2(subtotal + taxable);
    mergeTaxLines(merged, lineTaxParts(taxable, item.taxRate, ctx));
  }
  let taxLines = [...merged.values()];
  const totalTax = round2(taxLines.reduce((sum, line) => sum + line.amount, 0));
  if (totalTax === 0) taxLines = [];
  const exactTotal = round2(subtotal + totalTax);
  const grandTotal = ctx.roundWhole ? Math.round(exactTotal) : exactTotal;
  return { subtotal, taxLines, totalTax, exactTotal, roundOff: round2(grandTotal - exactTotal), grandTotal };
}

/** Per-rate table printed on the invoice. */
export function summarizeByRate(items: InvoiceItem[], ctx: TaxContext): RateSummaryRow[] {
  if (ctx.treatment === TaxTreatment.Exempt) {
    const taxable = round2(items.reduce((sum, item) => sum + lineTaxable(item), 0));
    return items.length ? [{ rate: 0, taxable, taxLines: [], totalTax: 0 }] : [];
  }
  const groups = new Map<number, { taxable: number; lines: Map<string, TaxLine> }>();
  for (const item of items) {
    const rate = Number(item.taxRate) || 0;
    const taxable = lineTaxable(item);
    const group = groups.get(rate) ?? { taxable: 0, lines: new Map<string, TaxLine>() };
    group.taxable = round2(group.taxable + taxable);
    mergeTaxLines(group.lines, lineTaxParts(taxable, rate, ctx));
    groups.set(rate, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, group]) => {
      const taxLines = [...group.lines.values()];
      return {
        rate,
        taxable: group.taxable,
        taxLines,
        totalTax: round2(taxLines.reduce((sum, line) => sum + line.amount, 0)),
      };
    });
}
