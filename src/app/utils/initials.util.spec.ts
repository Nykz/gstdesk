import { initials } from './initials.util';

describe('initials', () => {
  it.each([
    ['Bluepeak Logistics Pvt Ltd', 'BL'],
    ['Kapoor & Sons Traders', 'K&'],
    ['Lotus Café (unregistered)', 'LC'],
    ['  mehta  ', 'M'],
    ['', '?'],
  ])('%s becomes %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
