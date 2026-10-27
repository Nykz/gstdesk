const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Base-36 Luhn-style check character for the first 14 characters. */
export function gstinChecksum(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
}

export function isValidGstin(value: string): boolean {
  const gstin = value.trim().toUpperCase();
  return GSTIN_SHAPE.test(gstin) && gstinChecksum(gstin.slice(0, 14)) === gstin[14];
}

/** Builds a structurally valid GSTIN from a 2-digit state code and a 10-character PAN. */
export function buildGstin(stateCode: string, pan: string, entityNumber = '1'): string {
  const first14 = `${stateCode}${pan}${entityNumber}Z`;
  return first14 + gstinChecksum(first14);
}

export function stateCodeFromGstin(value: string): string | null {
  return isValidGstin(value) ? value.trim().slice(0, 2) : null;
}
