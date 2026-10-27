import { newId } from './id.util';

describe('newId', () => {
  it('is prefixed and unique', () => {
    const a = newId('inv');
    expect(a.startsWith('inv_')).toBe(true);
    expect(newId('inv')).not.toBe(a);
  });
});
