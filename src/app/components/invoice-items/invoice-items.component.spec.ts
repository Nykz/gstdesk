import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceItem } from '../../interfaces/invoice.interface';
import { TaxRegime } from '../../interfaces/tax-regime.interface';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { getRegime } from '../../utils/tax-regimes';
import { InvoiceItemsComponent } from './invoice-items.component';

const item = (id: string, overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id, description: 'Work', itemCode: '', quantity: 2, rate: 100, taxRate: 18, ...overrides,
});

@Component({
  imports: [InvoiceItemsComponent],
  template: `<app-invoice-items [(items)]="items" [regime]="regime()" locale="en-IN" [exempt]="exempt()" />`,
})
class HostComponent {
  readonly items = signal<InvoiceItem[]>([item('a'), item('b')]);
  readonly regime = signal<TaxRegime>(getRegime('IN'));
  readonly exempt = signal(false);
}

const input = (name: string, detail: unknown) => new CustomEvent(name, { detail });

describe('InvoiceItemsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: InvoiceItemsComponent;

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: provideNativeMocks().providers });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle();
    component = fixture.debugElement.children[0].componentInstance;
  });

  it('renders a row per item with the line amount', () => {
    expect(fixture.nativeElement.querySelectorAll('ion-row')).toHaveLength(2);
    expect(component.rows()[0].amount).toBe('200.00');
  });

  it('adds an item using the business default tax rate', async () => {
    component.add();
    await settle();
    expect(host.items()).toHaveLength(3);
    expect(host.items()[2]).toMatchObject({ quantity: 1, rate: 0, taxRate: 18, description: '' });
  });

  it('removes an item', async () => {
    component.remove('a');
    await settle();
    expect(host.items().map((i) => i.id)).toEqual(['b']);
  });

  it('edits text and numeric fields', async () => {
    component.setText('a', 'description', input('ionInput', { value: 'Design' }));
    component.setNumber('a', 'rate', input('ionInput', { value: '250.5' }));
    component.setNumber('a', 'quantity', input('ionInput', { value: '' }));
    await settle();
    expect(host.items()[0]).toMatchObject({ description: 'Design', rate: 250.5, quantity: 0 });
    expect(host.items()[1].description).toBe('Work');
  });

  it('uses a select for fixed-rate regimes and a number input for manual-rate ones', async () => {
    expect(component.rateAsSelect()).toBe(true);
    expect(fixture.nativeElement.querySelector('ion-select')).not.toBeNull();
    host.regime.set(getRegime('US'));
    await settle();
    expect(component.rateAsSelect()).toBe(false);
    expect(fixture.nativeElement.querySelector('ion-select')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('ion-input[type="number"]').length).toBeGreaterThan(4);
  });

  it('labels the columns from the regime', async () => {
    host.regime.set(getRegime('GB'));
    await settle();
    const labels = [...fixture.nativeElement.querySelectorAll('ion-input, ion-select')].map(
      (el) => (el as HTMLElement & { label?: string }).label,
    );
    expect(labels).toContain('Item code');
    expect(labels).toContain('VAT');
  });

  it('hides the tax rate when the invoice is exempt', async () => {
    host.exempt.set(true);
    await settle();
    expect(fixture.nativeElement.querySelector('ion-select')).toBeNull();
  });

  it('keeps at least one row', () => {
    host.items.set([item('only')]);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button[aria-label="Remove item 1"]') as HTMLElement;
    expect(button.hasAttribute('disabled') || (button as HTMLIonButtonElement).disabled).toBe(true);
  });
});
