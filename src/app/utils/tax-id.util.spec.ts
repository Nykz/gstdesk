import { buildGstin } from './gstin.util';
import { FOREIGN_TAX_ID_LABEL, customerTaxIdLabel, isTaxIdValid, normalizeTaxId, taxIdError } from './tax-id.util';
import { getRegime } from './tax-regimes';

describe('tax-id.util', () => {
  it('blank is always valid', () => {
    for (const code of ['IN', 'US', 'GB']) {
      expect(isTaxIdValid(getRegime(code), '')).toBe(true);
      expect(isTaxIdValid(getRegime(code), '   ')).toBe(true);
    }
  });

  it('India requires a checksum-valid GSTIN', () => {
    const india = getRegime('IN');
    expect(isTaxIdValid(india, buildGstin('29', 'AABCU9603R'))).toBe(true);
    expect(isTaxIdValid(india, '29AABCU9603R1ZZ')).toBe(false);
    expect(isTaxIdValid(india, 'nonsense')).toBe(false);
  });

  it('other regimes use a loose shape check', () => {
    expect(isTaxIdValid(getRegime('GB'), 'GB123456789')).toBe(true);
    expect(isTaxIdValid(getRegime('US'), '12-3456789')).toBe(true);
    expect(isTaxIdValid(getRegime('AU'), '51 824 753 556')).toBe(true);
    expect(isTaxIdValid(getRegime('GB'), '!!')).toBe(false);
    expect(isTaxIdValid(getRegime('GB'), 'ab')).toBe(false);
  });

  it('error message names the regime label', () => {
    expect(taxIdError(getRegime('IN'), 'bad')).toContain('GSTIN');
    expect(taxIdError(getRegime('IN'), '')).toBeNull();
  });

  it('normalizes', () => {
    expect(normalizeTaxId(' gb123 ')).toBe('GB123');
  });

  it('a foreign customer of an Indian business is not held to the GSTIN format', () => {
    const india = getRegime('IN');
    expect(isTaxIdValid(india, '12-3456789', false)).toBe(true);
    expect(isTaxIdValid(india, '12-3456789')).toBe(false);
    expect(isTaxIdValid(india, '!!', false)).toBe(false);
  });

  it('names a foreign tax ID generically and keeps the regime label at home', () => {
    const india = getRegime('IN');
    expect(customerTaxIdLabel(india, true)).toBe('GSTIN');
    expect(customerTaxIdLabel(india, false)).toBe(FOREIGN_TAX_ID_LABEL);
    expect(taxIdError(india, '!!', false)).toBe(`Enter a valid ${FOREIGN_TAX_ID_LABEL} or leave it blank.`);
  });
});
