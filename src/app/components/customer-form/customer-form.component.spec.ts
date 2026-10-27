import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { Customer } from '../../interfaces/customer.interface';
import { BusinessService } from '../../services/business/business.service';
import { buildGstin } from '../../utils/gstin.util';
import { CustomerFormComponent } from './customer-form.component';

const event = (value: string) => new CustomEvent('ionInput', { detail: { value } });

describe('CustomerFormComponent', () => {
  let fixture: ComponentFixture<CustomerFormComponent>;
  let component: CustomerFormComponent;
  const dismiss = vi.fn();

  beforeEach(async () => {
    dismiss.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [...provideNativeMocks().providers, { provide: ModalController, useValue: { dismiss } }],
    });
    fixture = TestBed.createComponent(CustomerFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('starts blank in the business country for a new customer', () => {
    expect(component.isEdit()).toBe(false);
    expect(component.form()).toMatchObject({ name: '', country: 'IN', taxId: '' });
  });

  it('will not save without a name', async () => {
    await component.save();
    expect(component.nameError()).toBe(true);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('saves a trimmed draft', async () => {
    component.setText('name', event('  Acme  '));
    await component.save();
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme' }), 'save');
  });

  it('a valid GSTIN fills the state', () => {
    component.setTaxId(event(buildGstin('29', 'AABCK1234F').toLowerCase()));
    expect(component.form().taxId).toBe(buildGstin('29', 'AABCK1234F'));
    expect(component.form().regionCode).toBe('29');
    expect(component.taxIdError()).toBe(false);
  });

  it('an invalid GSTIN blocks saving; blank is fine', async () => {
    component.setText('name', event('Acme'));
    component.setTaxId(event('NOPE'));
    expect(component.taxIdError()).toBe(true);
    await component.save();
    expect(dismiss).not.toHaveBeenCalled();
    component.setTaxId(event(''));
    expect(component.taxIdError()).toBe(false);
  });

  it('shows the region only for domestic customers and clears it for foreign ones', async () => {
    expect(component.showRegion()).toBe(true);
    component.setText('regionCode', event('27'));
    component.setCountry(event('US'));
    expect(component.showRegion()).toBe(false);
    expect(component.form().regionCode).toBe('');
    component.setText('name', event('Acme Inc'));
    await component.save();
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ country: 'US', regionCode: '' }), 'save');
  });

  it('does not hold a foreign customer to the GSTIN format', async () => {
    component.setText('name', event('Acme Inc'));
    component.setCountry(event('US'));
    component.setTaxId(event('12-3456789'));
    expect(component.taxIdLabel()).toBe('Tax ID / VAT no.');
    expect(component.taxIdError()).toBe(false);
    await component.save();
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ country: 'US', taxId: '12-3456789' }), 'save');
  });

  it('uses the business regime labels', async () => {
    await TestBed.inject(BusinessService).setCountry('GB');
    expect(component.regime().taxIdLabel).toBe('VAT number');
    expect(component.showRegion()).toBe(false);
  });

  it('cancels', async () => {
    await component.cancel();
    expect(dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('edits an existing customer and keeps its id', async () => {
    const existing: Customer = {
      id: 'c9', name: 'Old Name', taxId: '', country: 'IN', regionCode: '27', email: '', phone: '', address: '',
    };
    // The modal controller assigns componentProps straight onto the instance.
    component.customer = existing;
    fixture.detectChanges();
    expect(component.isEdit()).toBe(true);
    expect(component.form().name).toBe('Old Name');
    component.setText('name', event('New Name'));
    await component.save();
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'c9', name: 'New Name' }), 'save');
  });
});
