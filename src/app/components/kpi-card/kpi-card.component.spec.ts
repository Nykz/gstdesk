import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;

  const render = async (inputs: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(KpiCardComponent);
  });

  it('shows the label, value and caption', async () => {
    const el = await render({ label: 'Outstanding', value: '₹1,89,948', caption: 'Waiting on customers' });
    expect(el.textContent).toContain('Outstanding');
    expect(el.textContent).toContain('₹1,89,948');
    expect(el.textContent).toContain('Waiting on customers');
  });

  it('flags an alert figure', async () => {
    const el = await render({ label: 'Overdue', value: '₹1', alert: true, tone: 'danger' });
    expect(el.querySelector('ion-card')?.getAttribute('data-alert')).toBe('true');
    expect((el.querySelector('ion-icon') as HTMLElement & { color?: string }).color).toBe('danger');
  });
});
