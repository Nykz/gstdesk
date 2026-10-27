import { buildGstin, gstinChecksum, isValidGstin, stateCodeFromGstin } from './gstin.util';

describe('gstin.util', () => {
  const valid = buildGstin('27', 'AABCU9603R');

  it('builds a 15 character GSTIN that validates', () => {
    expect(valid).toHaveLength(15);
    expect(valid.startsWith('27AABCU9603R1Z')).toBe(true);
    expect(isValidGstin(valid)).toBe(true);
  });

  it('matches a known real-world checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(gstinChecksum('27AAPFU0939F1Z')).toBe('V');
  });

  it('rejects a wrong check character', () => {
    const wrong = valid.slice(0, 14) + (valid[14] === 'A' ? 'B' : 'A');
    expect(isValidGstin(wrong)).toBe(false);
  });

  it('rejects wrong shape and length', () => {
    expect(isValidGstin('27AABCU9603R1Z')).toBe(false);
    expect(isValidGstin('')).toBe(false);
    expect(isValidGstin('XXAABCU9603R1ZA')).toBe(false);
  });

  it('is case and whitespace tolerant', () => {
    expect(isValidGstin(` ${valid.toLowerCase()} `)).toBe(true);
  });

  it('reads the state code only from a valid GSTIN', () => {
    expect(stateCodeFromGstin(valid)).toBe('27');
    expect(stateCodeFromGstin('27AABCU9603R1ZX')).toBeNull();
  });
});
