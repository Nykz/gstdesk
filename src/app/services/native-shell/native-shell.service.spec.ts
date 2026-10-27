import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { NativeShellService } from './native-shell.service';

describe('NativeShellService', () => {
  let service: NativeShellService;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let mocks: ReturnType<typeof provideNativeMocks>;

  beforeEach(async () => {
    navigateByUrl = vi.fn().mockResolvedValue(true);
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({
      providers: [...mocks.providers, { provide: Router, useValue: { navigateByUrl } }],
    });
    service = TestBed.inject(NativeShellService);
    await service.start();
  });

  it('navigates on the gstdesk-navigate window event, whitelist only', async () => {
    window.dispatchEvent(new CustomEvent('gstdesk-navigate', { detail: '/customers' }));
    window.dispatchEvent(new CustomEvent('gstdesk-navigate', { detail: '/secret' }));
    window.dispatchEvent(new CustomEvent('gstdesk-navigate', { detail: 42 }));
    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).toHaveBeenCalledWith('/customers');
  });

  it('counts print requests', () => {
    expect(service.printRequests()).toBe(0);
    window.dispatchEvent(new Event('gstdesk-print'));
    window.dispatchEvent(new Event('gstdesk-print'));
    expect(service.printRequests()).toBe(2);
  });

  it('handles appUrlOpen deep links', () => {
    const listener = mocks.app.listeners.get('appUrlOpen')!;
    listener({ url: 'gstdesk://invoices/new' });
    listener({ url: 'gstdesk://customers' });
    listener({ url: 'https://evil.example/settings' });
    expect(navigateByUrl.mock.calls.map((c) => c[0])).toEqual(['/invoices/new', '/customers']);
  });

  it('maps urls to paths', () => {
    expect(service.pathFromUrl('gstdesk://invoices/new/')).toBe('/invoices/new');
    expect(service.pathFromUrl('GSTDESK://settings?x=1')).toBe('/settings');
    expect(service.pathFromUrl('http://x')).toBe('');
  });

  it('only allows the five whitelisted paths', async () => {
    for (const path of ['/dashboard', '/invoices', '/invoices/new', '/customers', '/settings']) {
      expect(await service.navigate(path)).toBe(true);
    }
    expect(await service.navigate('/invoices/123')).toBe(false);
    expect(await service.navigate('//evil')).toBe(false);
    expect(await service.navigate('')).toBe(false);
  });

  it('starting twice does not double-register', async () => {
    await service.start();
    window.dispatchEvent(new Event('gstdesk-print'));
    expect(service.printRequests()).toBe(1);
  });
});
