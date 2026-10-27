import { TaxRegime } from '../interfaces/tax-regime.interface';
import { isValidGstin } from './gstin.util';

const LOOSE_TAX_ID = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{3,24}$/;

/** What a customer's tax ID is called when they are outside the business's own tax regime. */
export const FOREIGN_TAX_ID_LABEL = 'Tax ID / VAT no.';
export const FOREIGN_TAX_ID_PLACEHOLDER = 'e.g. 12-3456789 or GB123456789';

/**
 * Blank is always valid (unregistered). India checks the full GSTIN, others a loose shape.
 * A customer outside the regime (`domestic` false) has a foreign tax ID, so only the loose shape applies.
 */
export function isTaxIdValid(regime: TaxRegime, taxId: string, domestic = true): boolean {
  const value = taxId.trim();
  if (!value) return true;
  return regime.code === 'IN' && domestic ? isValidGstin(value) : LOOSE_TAX_ID.test(value);
}

export function customerTaxIdLabel(regime: TaxRegime, domestic: boolean): string {
  return domestic ? regime.taxIdLabel : FOREIGN_TAX_ID_LABEL;
}

export function taxIdError(regime: TaxRegime, taxId: string, domestic = true): string | null {
  return isTaxIdValid(regime, taxId, domestic)
    ? null
    : `Enter a valid ${customerTaxIdLabel(regime, domestic)} or leave it blank.`;
}

export function normalizeTaxId(taxId: string): string {
  return taxId.trim().toUpperCase();
}
