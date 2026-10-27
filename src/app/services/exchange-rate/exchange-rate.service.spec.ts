import { TestBed } from '@angular/core/testing';
import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    service = TestBed.inject(ExchangeRateService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const respond = (body: unknown, ok = true) => fetchMock.mockResolvedValue({ ok, json: async () => body });

  it('returns the rate for one unit of the invoice currency in the home currency', async () => {
    respond({ rates: { INR: 83.25 } });
    expect(await service.latest('USD', 'INR')).toBe(83.25);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR');
  });

  it('works for any pair, not only rupees', async () => {
    respond({ rates: { USD: 1.27 } });
    expect(await service.latest('GBP', 'USD')).toBe(1.27);
    expect(fetchMock.mock.calls[0][0]).toContain('base=GBP&symbols=USD');
  });

  it('needs no lookup for the same currency', async () => {
    expect(await service.latest('USD', 'USD')).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null offline, on an error status, or for a currency the source does not have', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await service.latest('USD', 'INR')).toBeNull();
    respond({}, false);
    expect(await service.latest('USD', 'AED')).toBeNull();
    respond({ rates: {} });
    expect(await service.latest('USD', 'AED')).toBeNull();
    respond({ rates: { INR: 'x' } });
    expect(await service.latest('USD', 'INR')).toBeNull();
  });

  it('never sends anything that is not a currency code', async () => {
    expect(await service.latest('usd', 'INR')).toBeNull();
    expect(await service.latest('USD', 'INR&x=1')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
