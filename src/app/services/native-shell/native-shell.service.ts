import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PLUGIN } from '../../tokens/native-plugins.tokens';

export const NAVIGATE_EVENT = 'gstdesk-navigate';
export const PRINT_EVENT = 'gstdesk-print';
export const DEEP_LINK_SCHEME = 'gstdesk://';

export const ALLOWED_PATHS = ['/dashboard', '/invoices', '/invoices/new', '/customers', '/settings'];

/**
 * Bridge for a native shell (desktop menus, deep links). On the web nothing fires, so it does nothing.
 * The shell talks to the page with the window events `gstdesk-navigate` and `gstdesk-print`
 * and the Capacitor App `appUrlOpen` event.
 */
@Injectable({ providedIn: 'root' })
export class NativeShellService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly app = inject(APP_PLUGIN);

  private readonly _printRequests = signal(0);
  /** Counter that goes up whenever the shell asks to print the open invoice. */
  readonly printRequests = this._printRequests.asReadonly();

  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const view = this.document.defaultView;
    view?.addEventListener(NAVIGATE_EVENT, (event) => {
      const path = (event as CustomEvent<unknown>).detail;
      if (typeof path === 'string') void this.navigate(path);
    });
    view?.addEventListener(PRINT_EVENT, () => this._printRequests.update((n) => n + 1));
    try {
      await this.app.addListener('appUrlOpen', ({ url }) => void this.navigate(this.pathFromUrl(url)));
    } catch {
      // No native App plugin (plain browser): nothing to listen to.
    }
  }

  /** `gstdesk://invoices/new` becomes `/invoices/new`. */
  pathFromUrl(url: string): string {
    if (!url.toLowerCase().startsWith(DEEP_LINK_SCHEME)) return '';
    const rest = url.slice(DEEP_LINK_SCHEME.length).split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    return `/${rest}`;
  }

  /** Navigates only to the whitelist. Returns whether it navigated. */
  async navigate(path: string): Promise<boolean> {
    const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
    if (!ALLOWED_PATHS.includes(clean)) return false;
    return this.router.navigateByUrl(clean);
  }
}
