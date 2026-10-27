import { axisTicks, donutArcs, niceMax } from './chart.util';

describe('chart.util', () => {
  it('picks a nice axis maximum', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(10)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(21)).toBe(25);
    expect(niceMax(26)).toBe(50);
    expect(niceMax(51)).toBe(100);
    expect(niceMax(420000)).toBe(500000);
    expect(niceMax(0.3)).toBeCloseTo(0.5);
  });

  it('builds evenly spaced ticks', () => {
    expect(axisTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(10, 2)).toEqual([0, 5, 10]);
  });

  it('builds donut arcs that add up to the circumference', () => {
    const arcs = donutArcs([1, 3], 100);
    expect(arcs.map((a) => a.dash)).toEqual([25, 75]);
    expect(arcs.map((a) => a.offset)).toEqual([-0, -25]);
    expect(arcs[0].gap).toBe(75);
    expect(arcs.reduce((s, a) => s + a.fraction, 0)).toBeCloseTo(1);
  });

  it('returns no arcs when everything is zero', () => {
    expect(donutArcs([0, 0], 100)).toEqual([]);
    expect(donutArcs([], 100)).toEqual([]);
  });
});
