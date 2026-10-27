import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'invoices',
    loadComponent: () => import('./pages/invoices/invoices.page').then((m) => m.InvoicesPage),
  },
  {
    path: 'invoices/new',
    loadComponent: () =>
      import('./pages/invoice-editor/invoice-editor.page').then((m) => m.InvoiceEditorPage),
  },
  {
    path: 'invoices/:id',
    loadComponent: () =>
      import('./pages/invoice-editor/invoice-editor.page').then((m) => m.InvoiceEditorPage),
  },
  {
    path: 'customers',
    loadComponent: () => import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
