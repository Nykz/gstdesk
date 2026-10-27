import { guessRegime } from './locale.util';

describe('guessRegime', () => {
  it.each([
    ['en-IN', 'IN'],
    ['en-US', 'US'],
    ['en-GB', 'GB'],
    ['de-DE', 'EU'],
    ['fr-FR', 'EU'],
    ['en_AU', 'AU'],
    ['en-SG', 'SG'],
    ['ar-AE', 'AE'],
  ])('%s uses %s rules', (locale, code) => {
    expect(guessRegime(locale)).toBe(code);
  });

  it('falls back to the custom regime when the country or locale is unknown', () => {
    expect(guessRegime('pt-BR')).toBe('CUSTOM');
    expect(guessRegime('en')).toBe('CUSTOM');
    expect(guessRegime('')).toBe('CUSTOM');
    expect(guessRegime(undefined)).toBe('CUSTOM');
  });
});
