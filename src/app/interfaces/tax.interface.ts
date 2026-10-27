import { TaxTreatment } from '../enums/tax-treatment.enum';
import { TaxRegime } from './tax-regime.interface';

export interface TaxContext {
  regime: TaxRegime;
  sameRegion: boolean;
  treatment: TaxTreatment;
  roundWhole: boolean;
}

export interface TaxLine {
  key: string;
  label: string;
  amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxLines: TaxLine[];
  totalTax: number;
  exactTotal: number;
  roundOff: number;
  grandTotal: number;
}

export interface RateSummaryRow {
  rate: number;
  taxable: number;
  taxLines: TaxLine[];
  totalTax: number;
}
