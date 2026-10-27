/** A "nice" axis maximum (1, 2, 2.5, 5 or 10 times a power of ten) at or above `value`. */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const fraction = value / base;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate + 1e-9) ?? 10;
  return step * base;
}

/** Evenly spaced tick values from 0 to `max`. */
export function axisTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

export interface DonutArc {
  index: number;
  dash: number;
  gap: number;
  offset: number;
  fraction: number;
}

/** Stroke-dash geometry for donut segments on a circle of the given circumference. */
export function donutArcs(values: number[], circumference: number): DonutArc[] {
  const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0);
  if (total <= 0) return [];
  let consumed = 0;
  return values.map((raw, index) => {
    const value = Math.max(raw, 0);
    const fraction = value / total;
    const dash = fraction * circumference;
    const arc = { index, dash, gap: circumference - dash, offset: -consumed, fraction };
    consumed += dash;
    return arc;
  });
}
