import { inject } from '@angular/core';
import { BusinessService } from './services/business/business.service';
import { CustomerService } from './services/customer/customer.service';
import { InvoiceService } from './services/invoice/invoice.service';
import { SetupService } from './services/setup/setup.service';
import { NativeShellService } from './services/native-shell/native-shell.service';
import { ThemeService } from './services/theme/theme.service';

/**
 * Startup order: theme, business and customers, then invoices, then the first-run check (a brand-new install
 * is asked for its country and currency; nothing is seeded). Every dependency is injected before the first await.
 */
export async function initializeApp(): Promise<void> {
  const theme = inject(ThemeService);
  const business = inject(BusinessService);
  const customers = inject(CustomerService);
  const invoices = inject(InvoiceService);
  const setup = inject(SetupService);
  const nativeShell = inject(NativeShellService);

  await theme.load();
  await Promise.all([business.load(), customers.load()]);
  await invoices.load();
  await setup.check();
  await nativeShell.start();
}
