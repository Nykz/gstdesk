import { TaxEngine } from '../enums/tax-engine.enum';
import {
  getRegime,
  hasRegions,
  isDomesticCountry,
  regionName,
  TAX_REGIMES,
  withCustomTaxName,
} from './tax-regimes';

describe('tax-regimes', () => {
  it('has the eight regimes with unique codes', () => {
    const codes = TAX_REGIMES.map((r) => r.code);
    expect(codes).toEqual(['IN', 'US', 'GB', 'EU', 'AU', 'SG', 'AE', 'CUSTOM']);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every regime has the labels the UI needs', () => {
    for (const regime of TAX_REGIMES) {
      expect(regime.taxName, regime.code).toBeTruthy();
      expect(regime.taxIdLabel, regime.code).toBeTruthy();
      expect(regime.documentTitle, regime.code).toBeTruthy();
      expect(regime.exemptNote, regime.code).toBeTruthy();
      expect(regime.fiscalYearStartMonth).toBeGreaterThanOrEqual(1);
      expect(regime.fiscalYearStartMonth).toBeLessThanOrEqual(12);
    }
  });

  it('India: split by region, whole rupee, April year', () => {
    const india = getRegime('IN');
    expect(india.engine).toBe(TaxEngine.SplitByRegion);
    expect(india.rates).toEqual([0, 5, 12, 18, 28]);
    expect(india.splitLabels).toEqual(['CGST', 'SGST']);
    expect(india.interLabel).toBe('IGST');
    expect(india.roundToWhole).toBe(true);
    expect(india.fiscalYearStartMonth).toBe(4);
  });

  it('US has 50 states plus DC and a manual rate', () => {
    const us = getRegime('US');
    expect(us.regions).toHaveLength(51);
    expect(us.engine).toBe(TaxEngine.ManualRate);
    expect(us.documentTitle).toBe('INVOICE');
  });

  it('GB, AU, SG, AE use a single rate', () => {
    expect(getRegime('GB').documentTitle).toBe('VAT INVOICE');
    expect(getRegime('GB').rates).toEqual([0, 5, 20]);
    expect(getRegime('AU').fiscalYearStartMonth).toBe(7);
    expect(getRegime('SG').rates).toEqual([0, 9]);
    expect(getRegime('AE').rates).toEqual([0, 5]);
    for (const code of ['GB', 'AU', 'SG', 'AE']) {
      expect(getRegime(code).engine).toBe(TaxEngine.SingleRate);
    }
  });

  it('EU treats 13 countries as domestic', () => {
    const eu = getRegime('EU');
    expect(eu.domesticCountries).toHaveLength(13);
    expect(eu.rates).toEqual([0, 5, 7, 10, 19, 20, 21, 23]);
    expect(eu.currency).toBe('EUR');
  });

  it('unknown or missing codes fall back to India', () => {
    expect(getRegime('ZZ').code).toBe('IN');
    expect(getRegime(undefined).code).toBe('IN');
    expect(getRegime(null).code).toBe('IN');
  });

  it('CUSTOM takes the user-named tax', () => {
    const custom = getRegime('CUSTOM');
    expect(withCustomTaxName(custom, ' Sales Levy ').taxName).toBe('Sales Levy');
    expect(withCustomTaxName(custom, '  ').taxName).toBe('Tax');
    expect(withCustomTaxName(getRegime('GB'), 'Zed').taxName).toBe('VAT');
  });

  it('domestic and region helpers', () => {
    expect(isDomesticCountry(getRegime('IN'), 'IN')).toBe(true);
    expect(isDomesticCountry(getRegime('IN'), 'US')).toBe(false);
    expect(regionName(getRegime('IN'), '27')).toBe('Maharashtra');
    expect(regionName(getRegime('IN'), '99')).toBe('99');
    expect(hasRegions(getRegime('IN'))).toBe(true);
    expect(hasRegions(getRegime('GB'))).toBe(false);
  });
});
