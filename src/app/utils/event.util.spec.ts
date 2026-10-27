import { eventChecked, eventNumber, eventValue } from './event.util';

const event = (detail: unknown) => new CustomEvent('x', { detail });

describe('event.util', () => {
  it('reads text values', () => {
    expect(eventValue(event({ value: 'abc' }))).toBe('abc');
    expect(eventValue(event({ value: 12 }))).toBe('12');
    expect(eventValue(event({ value: null }))).toBe('');
    expect(eventValue(new Event('x'))).toBe('');
  });

  it('reads numbers with a fallback', () => {
    expect(eventNumber(event({ value: '12.5' }))).toBe(12.5);
    expect(eventNumber(event({ value: '' }), 7)).toBe(7);
    expect(eventNumber(event({ value: 'abc' }), 3)).toBe(3);
  });

  it('reads toggle state', () => {
    expect(eventChecked(event({ checked: true }))).toBe(true);
    expect(eventChecked(event({}))).toBe(false);
  });
});
