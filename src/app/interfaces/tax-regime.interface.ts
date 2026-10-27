import { TaxEngine } from '../enums/tax-engine.enum';

export interface Region {
  code: string;
  name: string;
}

export interface TaxRegime {
  code: string;
  name: string;
  defaultCountry: string;
  domesticCountries: string[];
  currency: string;
  locale: string;
  engine: TaxEngine;
  taxName: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  itemCodeLabel: string;
  documentTitle: string;
  rates: number[];
  defaultRate: number;
  /** Labels for the parts of a same-region split, e.g. CGST and SGST. */
  splitLabels: string[];
  /** Label of the single part for supplies to another region, e.g. IGST. */
  interLabel: string;
  regionLabel: string;
  regions: Region[];
  defaultRegion: string;
  roundToWhole: boolean;
  /** 1 to 12. */
  fiscalYearStartMonth: number;
  bankCodeLabel: string;
  paymentIdLabel: string;
  paymentIdPlaceholder: string;
  exemptLabel: string;
  exemptNote: string;
}
