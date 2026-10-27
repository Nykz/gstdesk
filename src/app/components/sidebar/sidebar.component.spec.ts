import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from '../../services/business/business.service';
import { NAV_ITEMS, SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideNativeMocks().providers] });
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await settle();
  });

  it('lists the four screens and a New invoice button', () => {
    expect(NAV_ITEMS.map((i) => i.path)).toEqual(['/dashboard', '/invoices', '/customers', '/settings']);
    const text = fixture.nativeElement.textContent as string;
    for (const item of NAV_ITEMS) expect(text).toContain(item.label);
    expect(text).toContain('New invoice');
  });

  it('prompts to set up a business that has no name', () => {
    expect(component.businessName()).toBe('Set up your business');
    expect(component.taxIdLine()).toBe('No GSTIN added');
  });

  it('shows the business chip with the regime tax ID label', async () => {
    const service = TestBed.inject(BusinessService);
    await service.update({ name: 'Aarav Digital Studio', taxId: '27AAPFU0939F1ZV' });
    await settle();
    expect(fixture.nativeElement.textContent).toContain('Aarav Digital Studio');
    expect(fixture.nativeElement.textContent).toContain('GSTIN: 27AAPFU0939F1ZV');
    await service.setCountry('GB');
    await service.update({ name: 'Thames', taxId: 'GB123456789' });
    await settle();
    expect(component.taxIdLine()).toBe('VAT number: GB123456789');
  });
});
