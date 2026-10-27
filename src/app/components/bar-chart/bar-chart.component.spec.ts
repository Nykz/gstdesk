import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthBar } from '../../interfaces/dashboard.interface';
import { BarChartComponent } from './bar-chart.component';

const bars: MonthBar[] = [
  { key: '2026-09', label: 'Sep', billed: 100000, collected: 100000 },
  { key: '2026-10', label: 'Oct', billed: 420000, collected: 0 },
];

describe('BarChartComponent', () => {
  let fixture: ComponentFixture<BarChartComponent>;
  let component: BarChartComponent;

  const render = async (data: MonthBar[], currency = 'INR', locale = 'en-IN') => {
    fixture.componentRef.setInput('bars', data);
    fixture.componentRef.setInput('currency', currency);
    fixture.componentRef.setInput('locale', locale);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
  });

  it('uses a nice axis maximum', async () => {
    await render(bars);
    expect(component.max()).toBe(500000);
  });

  it('draws two bars per month with heights proportional to the axis', async () => {
    await render(bars);
    const rects = fixture.nativeElement.querySelectorAll('rect') as NodeListOf<SVGRectElement>;
    expect(rects).toHaveLength(4);
    const octBilled = component.groups()[1].billed.height;
    const sepBilled = component.groups()[0].billed.height;
    expect(octBilled / sepBilled).toBeCloseTo(4.2);
    expect(component.groups()[1].collected.height).toBe(0);
  });

  it('labels the axis with the currency and the months', async () => {
    await render(bars);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('₹5L');
    expect(text).toContain('Sep');
    expect(text).toContain('Oct');
  });

  it('formats in other currencies', async () => {
    await render([{ key: 'k', label: 'Jan', billed: 2000000, collected: 1000000 }], 'USD', 'en-US');
    expect(fixture.nativeElement.textContent).toContain('$2M');
  });

  it('survives empty data', async () => {
    await render([]);
    expect(component.max()).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('rect')).toHaveLength(0);
  });
});
