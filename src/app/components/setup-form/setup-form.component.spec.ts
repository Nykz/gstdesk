import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { BusinessService } from '../../services/business/business.service';
import { SetupService } from '../../services/setup/setup.service';
import { SetupFormComponent } from './setup-form.component';

const event = (value: string) => new CustomEvent('x', { detail: { value } });

describe('SetupFormComponent', () => {
  let fixture: ComponentFixture<SetupFormComponent>;
  let component: SetupFormComponent;
  const dismiss = vi.fn();

  beforeEach(async () => {
    dismiss.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [...provideNativeMocks().providers, { provide: ModalController, useValue: { dismiss } }],
    });
    fixture = TestBed.createComponent(SetupFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('offers every country and follows the chosen country for the currency', () => {
    expect(component.regimes.length).toBeGreaterThan(5);
    component.setCountry(event('US'));
    expect(component.currency()).toBe('USD');
    component.setCountry(event('GB'));
    expect(component.currency()).toBe('GBP');
  });

  it('lets the owner pick a currency other than the country default, until the country changes', () => {
    component.setCountry(event('GB'));
    component.setCurrency(event('EUR'));
    expect(component.currency()).toBe('EUR');
    component.setCountry(event('AU'));
    expect(component.currency()).toBe('AUD');
  });

  it('always offers the country currency', () => {
    component.setCountry(event('AE'));
    expect(component.currencies()).toContain('AED');
  });

  it('needs a business name', async () => {
    await component.start();
    expect(component.nameError()).toBe(true);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('saves the business in the chosen country and currency, then closes', async () => {
    component.setName(event('  Brightwave Inc  '));
    component.setCountry(event('US'));
    await component.start();
    expect(TestBed.inject(BusinessService).business()).toMatchObject({
      name: 'Brightwave Inc', country: 'US', currency: 'USD',
    });
    expect(TestBed.inject(SetupService).needed()).toBe(false);
    expect(dismiss).toHaveBeenCalledWith(null, 'start');
  });

  it('can start with sample data instead', async () => {
    await component.useSampleData();
    expect(TestBed.inject(BusinessService).business().name).toBe('Aarav Digital Studio');
    expect(dismiss).toHaveBeenCalledWith(null, 'sample');
  });
});
