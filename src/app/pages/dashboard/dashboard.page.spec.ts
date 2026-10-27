import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let page: DashboardPage;

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideNativeMocks().providers] });
    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    await settle();
  });

  it('shows an empty state with calls to action on a fresh install', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No invoices yet');
    expect(text).toContain('Create an invoice');
    expect(text).toContain('Load demo data');
    expect(fixture.nativeElement.querySelector('app-bar-chart')).toBeNull();
  });

  it('loading demo data fills the dashboard', async () => {
    await TestBed.inject(DemoDataService).loadDemo();
    await settle();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Billed · FY');
    expect(root.querySelector('app-bar-chart')).not.toBeNull();
    expect(root.querySelector('app-donut-chart')).not.toBeNull();
    expect(root.textContent).toContain('Top customers');
    expect(root.textContent).toContain('Recent invoices');
    expect(root.querySelectorAll('ion-item[button]').length).toBe(6);
    expect(page.stats().billed).toBeGreaterThan(0);
    expect(page.money(1500)).toBe('₹1,500.00');
  });

  it('lists tax parts by their regime labels', async () => {
    await TestBed.inject(DemoDataService).loadDemo();
    await settle();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/CGST|IGST/);
  });

  it('recent invoices are newest first, drafts included, with the right status', async () => {
    await TestBed.inject(DemoDataService).loadDemo();
    await settle();
    expect(page.recent()[0].status).toBe('draft');
    expect(page.recent()).toHaveLength(6);
  });

  it('formats percentages and month change', async () => {
    expect(page.percent(0.256)).toBe('26%');
    expect(page.monthChange()).toBeNull();
    const invoices = TestBed.inject(InvoiceService);
    expect(invoices.invoices()).toEqual([]);
  });

  it('can load demo data from the empty state', async () => {
    await page.loadDemo();
    await settle();
    expect(page.stats().hasData).toBe(true);
  });

  it('refreshes today when entered', () => {
    expect(() => page.ionViewWillEnter()).not.toThrow();
  });
});
