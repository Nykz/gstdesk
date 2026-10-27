import { amountInWords } from './amount-in-words.util';

describe('amountInWords', () => {
  it('uses lakh and crore for rupees', () => {
    expect(amountInWords(1234567, 'INR')).toBe(
      'Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Only',
    );
    expect(amountInWords(25000000, 'INR')).toBe('Rupees Two Crore Fifty Lakh Only');
  });

  it('adds paise', () => {
    expect(amountInWords(105.5, 'INR')).toBe('Rupees One Hundred Five and Fifty Paise Only');
  });

  it('uses thousand, million and billion for other currencies', () => {
    expect(amountInWords(1234567, 'USD')).toBe(
      'US Dollars One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven Only',
    );
    expect(amountInWords(2000000000, 'USD')).toBe('US Dollars Two Billion Only');
  });

  it('names pounds and pence', () => {
    expect(amountInWords(12.07, 'GBP')).toBe('Pounds Twelve and Seven Pence Only');
  });

  it('handles zero, negatives and unknown currencies', () => {
    expect(amountInWords(0, 'INR')).toBe('Rupees Zero Only');
    expect(amountInWords(-5, 'EUR')).toBe('Minus Euros Five Only');
    expect(amountInWords(3, 'XYZ')).toBe('XYZ Three Only');
  });

  it('handles crores of crores for rupees', () => {
    expect(amountInWords(1000000000, 'INR')).toBe('Rupees One Hundred Crore Only');
  });
});
