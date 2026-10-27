import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonutChartComponent, DonutSegment } from './donut-chart.component';

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<DonutChartComponent>;
  let component: DonutChartComponent;

  const render = async (segments: DonutSegment[], currency = 'INR', locale = 'en-IN') => {
    fixture.componentRef.setInput('segments', segments);
    fixture.componentRef.setInput('currency', currency);
    fixture.componentRef.setInput('locale', locale);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(DonutChartComponent);
    component = fixture.componentInstance;
  });

  it('draws one arc per segment sized by share', async () => {
    await render([
      { label: 'CGST', value: 90 },
      { label: 'SGST', value: 90 },
      { label: 'IGST', value: 180 },
    ]);
    expect(component.arcs().map((a) => Math.round(a.dash))).toEqual([25, 25, 50]);
    // one track circle plus one per segment
    expect(fixture.nativeElement.querySelectorAll('circle')).toHaveLength(4);
  });

  it('lists each segment with its amount and the total in the middle', async () => {
    await render([
      { label: 'CGST', value: 1000 },
      { label: 'SGST', value: 1000 },
    ]);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CGST');
    expect(text).toContain('₹1K');
    expect(text).toContain('50%');
    expect(component.totalLabel()).toBe('₹2K');
  });

  it('cycles colours past five segments', async () => {
    await render(Array.from({ length: 6 }, (_, i) => ({ label: `S${i}`, value: 1 })));
    expect(component.legend()[5].color).toBe(component.legend()[0].color);
  });

  it('shows an empty message with no data', async () => {
    await render([]);
    expect(component.arcs()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No tax collected yet.');
  });
});
