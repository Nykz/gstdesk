import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { CustomerService } from '../../services/customer/customer.service';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { NotifyService } from '../../services/notify/notify.service';
import { CustomersPage } from './customers.page';

const event = (value: string) => new CustomEvent('x', { detail: { value } });
const draft = {
  name: 'New Co', taxId: '', country: 'IN', regionCode: '27', email: '', phone: '', address: '',
};

describe('CustomersPage', () => {
  let fixture: ComponentFixture<CustomersPage>;
  let page: CustomersPage;
  let service: CustomerService;
  const confirm = vi.fn();
  const toast = vi.fn();
  const create = vi.fn();
  let dismissal: { data?: unknown; role: string };

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    confirm.mockReset();
    toast.mockReset().mockResolvedValue(undefined);
    dismissal = { role: 'cancel' };
    create.mockReset().mockImplementation(async () => ({
      present: vi.fn(),
      onDidDismiss: async () => dismissal,
    }));
    TestBed.configureTestingModule({
      providers: [
        ...provideNativeMocks().providers,
        { provide: NotifyService, useValue: { confirm, toast } },
        { provide: ModalController, useValue: { create } },
      ],
    });
    fixture = TestBed.createComponent(CustomersPage);
    page = fixture.componentInstance;
    service = TestBed.inject(CustomerService);
    await settle();
  });

  it('shows an empty state without customers', () => {
    expect(fixture.nativeElement.textContent).toContain('No customers yet');
  });

  it('adds a customer from the modal', async () => {
    dismissal = { role: 'save', data: draft };
    await page.add();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ componentProps: { customer: undefined } }));
    expect(service.customers()).toHaveLength(1);
    expect(toast).toHaveBeenCalledWith('Customer added', 'success');
  });

  it('does nothing when the modal is cancelled', async () => {
    await page.add();
    expect(service.customers()).toEqual([]);
  });

  describe('with demo customers', () => {
    beforeEach(async () => {
      await TestBed.inject(DemoDataService).loadDemo();
      await settle();
    });

    it('renders a card per customer with place and tax ID line', () => {
      expect(fixture.nativeElement.querySelectorAll('ion-card')).toHaveLength(8);
      const cards = page.cards();
      expect(cards.filter((c) => c.taxIdLine === 'Unregistered')).toHaveLength(1);
      expect(cards.some((c) => c.taxIdLine.startsWith('GSTIN: '))).toBe(true);
      expect(cards.some((c) => c.place === 'Maharashtra')).toBe(true);
    });

    it('searches by name, tax ID and email', () => {
      page.setQuery(event('bluepeak'));
      expect(page.cards()).toHaveLength(1);
      page.setQuery(event(page.cards()[0].customer.taxId.slice(0, 6)));
      expect(page.cards().length).toBeGreaterThan(0);
      page.setQuery(event('nobody'));
      expect(page.cards()).toEqual([]);
    });

    it('edits through the modal', async () => {
      const first = service.customers()[0];
      dismissal = { role: 'save', data: { ...first, name: 'Renamed' } };
      await page.edit(first);
      expect(service.byId(first.id)?.name).toBe('Renamed');
      expect(toast).toHaveBeenCalledWith('Customer updated', 'success');
    });

    it('deletes only after confirmation', async () => {
      const first = service.customers()[0];
      confirm.mockResolvedValueOnce(false);
      await page.remove(first);
      expect(service.customers()).toHaveLength(8);
      confirm.mockResolvedValueOnce(true);
      await page.remove(first);
      expect(service.customers()).toHaveLength(7);
    });
  });
});
