import { routes } from './app.routes';

describe('routes', () => {
  const paths = routes.map((r) => r.path);

  it('has the six lazy screens', () => {
    for (const path of ['dashboard', 'invoices', 'invoices/new', 'invoices/:id', 'customers', 'settings']) {
      const route = routes.find((r) => r.path === path);
      expect(route?.loadComponent, path).toBeTypeOf('function');
    }
  });

  it('puts invoices/new before invoices/:id', () => {
    expect(paths.indexOf('invoices/new')).toBeLessThan(paths.indexOf('invoices/:id'));
  });

  it('redirects the empty path and unknown paths to the dashboard', () => {
    expect(routes.find((r) => r.path === '')).toMatchObject({ redirectTo: 'dashboard', pathMatch: 'full' });
    expect(routes.find((r) => r.path === '**')).toMatchObject({ redirectTo: 'dashboard' });
  });
});
