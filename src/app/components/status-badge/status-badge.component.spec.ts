import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisplayStatus } from '../../enums/invoice-status.enum';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  const render = async (status: DisplayStatus) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('ion-badge') as HTMLElement;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it.each([
    ['draft', 'Draft', 'medium'],
    ['unpaid', 'Unpaid', 'warning'],
    ['paid', 'Paid', 'success'],
    ['overdue', 'Overdue', 'danger'],
  ] as const)('%s shows %s in %s', async (status, label, color) => {
    const badge = await render(status);
    expect(badge.textContent?.trim()).toBe(label);
    expect(fixture.componentInstance.color()).toBe(color);
  });
});
