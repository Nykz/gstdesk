/** Value from an Ionic input/select/textarea event (`ionInput`, `ionChange`). */
export function eventValue(event: Event): string {
  const detail = (event as CustomEvent<{ value?: unknown }>).detail;
  const value = detail?.value;
  return value === null || value === undefined ? '' : String(value);
}

/** Numeric value from an Ionic event; blank or invalid becomes `fallback`. */
export function eventNumber(event: Event, fallback = 0): number {
  const text = eventValue(event).trim();
  if (text === '') return fallback;
  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
}

export function eventChecked(event: Event): boolean {
  return Boolean((event as CustomEvent<{ checked?: boolean }>).detail?.checked);
}
