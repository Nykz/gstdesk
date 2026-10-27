import { Injectable } from '@angular/core';

const ENDPOINT = 'https://api.frankfurter.dev/v1/latest';
const TIMEOUT_MS = 8000;
const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * Looks up today's reference rate (European Central Bank data via frankfurter.dev). It is only ever a
 * convenience: the owner can always type a rate, and offline or an unsupported currency simply returns null.
 * Only the two currency codes leave the device.
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  /** How much `to` one unit of `from` is worth, e.g. latest('USD', 'INR') is about 83. Null when unavailable. */
  async latest(from: string, to: string): Promise<number | null> {
    if (!CURRENCY_CODE.test(from) || !CURRENCY_CODE.test(to)) return null;
    if (from === to) return 1;
    try {
      const response = await fetch(`${ENDPOINT}?base=${from}&symbols=${to}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { rates?: Record<string, unknown> };
      const rate = body.rates?.[to];
      return typeof rate === 'number' && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }
}
