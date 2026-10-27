import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { TaxTreatment } from '../../enums/tax-treatment.enum';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NativeShellService } from '../../services/native-shell/native-shell.service';
import { NotifyService } from '../../services/notify/notify.service';
import { ExchangeRateService } from '../../services/exchange-rate/exchange-rate.service';
import { PrintService } from '../../services/print/print.service';
import { InvoiceEditorPage } from './invoice-editor.page';

const event = (value: unknown, key: 'value' | 'checked' = 'value') =>
  new CustomEvent('x', { detail: { [key]: value } });

describe('InvoiceEditorPage', () => {
  let fixture: ComponentFixture<InvoiceEditorPage>;
  let page: InvoiceEditorPage;
  let invoices: InvoiceService;
  let customers: CustomerService;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  const toast = vi.fn();
  const confirm = vi.fn();
  const printPaper = vi.fn();
const latestRate = vi.fn();
  const createModal = vi.fn();
  let modalResult: { role: string; data?: unknown };

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const build = async (id?: string) => {
    fixture = TestBed.createComponent(InvoiceEditorPage);
    page = fixture.componentInstance;
    if (id) fixture.componentRef.setInput('id', id);
    await settle();
  };

  const fillValid = async () => {
    const first = customers.customers()[0];
    page.setCustomer(event(first.id));
    page.setItems([{ id: 'x', description: 'Design work', itemCode: '998314', quantity: 2, rate: 5000, taxRate: 18 }]);
    await settle();
  };

  beforeEach(async () => {
    toast.mockReset().mockResolvedValue(undefined);
    confirm.mockReset();
    printPaper.mockReset();
    latestRate.mockReset();
    modalResult = { role: 'cancel' };
    createModal.mockReset().mockImplementation(async () => ({
      present: vi.fn(),
      onDidDismiss: async () => modalResult,
    }));
    TestBed.configureTestingModule({
      providers: [
        ...provideNativeMocks().providers,
        provideRouter([]),
        { provide: NotifyService, useValue: { toast, confirm } },
        { provide: PrintService, useValue: { print: printPaper } },
        { provide: ExchangeRateService, useValue: { latest: latestRate } },
        { provide: ModalController, useValue: { create: createModal } },
      ],
    });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    invoices = TestBed.inject(InvoiceService);
    customers = TestBed.inject(CustomerService);
    await TestBed.inject(DemoDataService).loadDemo('2026-10-27');
    await invoices.replaceAll([]);
  });

  describe('new invoice', () => {
    beforeEach(() => build());

    it('starts as a draft with a number, a due date 15 days out and one line', () => {
      const invoice = page.invoice();
      expect(page.isNew()).toBe(true);
      expect(invoice.status).toBe(InvoiceStatus.Draft);
      expect(invoice.number).toMatch(/^INV\/\d{2}-\d{2}\/001$/);
      expect(invoice.items).toHaveLength(1);
      expect(page.activeTerm()).toBe(15);
      expect(fixture.nativeElement.textContent).toContain('New invoice');
    });

    it('payment-term chips set the due date', () => {
      page.setTerms(30);
      expect(page.activeTerm()).toBe(30);
      page.setTerms(7);
      expect(page.activeTerm()).toBe(7);
    });

    it('changing the issue date keeps the terms and moves the number into the new fiscal year', () => {
      page.setTerms(30);
      page.setIssueDate(event('2027-04-02'));
      expect(page.invoice().dueDate).toBe('2027-05-02');
      expect(page.invoice().number).toBe('INV/27-28/001');
    });

    it('shows the exchange rate only for a foreign currency', async () => {
      expect(page.foreign()).toBe(false);
      expect(fixture.nativeElement.querySelector('ion-input[type="number"][min="0"][placeholder="e.g. 83.50"]')).toBeNull();
      page.setCurrency(event('USD'));
      await settle();
      expect(page.foreign()).toBe(true);
      expect(page.invoice().exchangeRate).toBe(0);
      expect(fixture.nativeElement.querySelector('ion-input[placeholder="e.g. 83.50"]')).not.toBeNull();
      page.setExchangeRate(event('83.5'));
      expect(page.invoice().exchangeRate).toBe(83.5);
      page.setCurrency(event('INR'));
      expect(page.invoice().exchangeRate).toBe(1);
    });

    it('a customer outside the regime turns tax to exempt automatically, and one tap undoes it', async () => {
      const foreign = await customers.add({
        name: 'Acme Inc', taxId: '', country: 'US', regionCode: '', email: '', phone: '', address: '',
      });
      page.setCustomer(event(foreign.id));
      expect(page.invoice().taxTreatment).toBe(TaxTreatment.Exempt);
      expect(page.autoExempt()).toBe(true);
      await settle();
      expect(fixture.nativeElement.textContent).toContain('Switched on automatically');
      page.setExempt(event(false, 'checked'));
      expect(page.invoice().taxTreatment).toBe(TaxTreatment.Standard);
      expect(page.autoExempt()).toBe(false);
    });

    it('a foreign customer also switches the invoice to their currency and asks for the exchange rate', async () => {
      const foreign = await customers.add({
        name: 'Acme Inc', taxId: '', country: 'US', regionCode: '', email: '', phone: '', address: '',
      });
      page.setCustomer(event(foreign.id));
      expect(page.invoice().currency).toBe('USD');
      expect(page.invoice().exchangeRate).toBe(0);
      expect(page.autoCurrency()).toBe(true);
      await settle();
      expect(fixture.nativeElement.textContent).toContain('enter today');
      page.setCurrency(event('EUR'));
      expect(page.autoCurrency()).toBe(false);
    });

    it("fills today's rate in the owner's own currency", async () => {
      latestRate.mockResolvedValue(83.123456);
      page.setCurrency(event('USD'));
      await page.fetchRate();
      expect(latestRate).toHaveBeenCalledWith('USD', page.business().currency);
      expect(page.invoice().exchangeRate).toBe(83.1235);
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('1 USD = 83.1235'), 'success');
      expect(page.fetchingRate()).toBe(false);
    });

    it('keeps the precision of a small rate', async () => {
      latestRate.mockResolvedValue(0.010512345);
      page.setCurrency(event('USD'));
      await page.fetchRate();
      expect(page.invoice().exchangeRate).toBe(0.0105123);
    });

    it('keeps the typed rate and says so when no rate can be fetched', async () => {
      latestRate.mockResolvedValue(null);
      page.setCurrency(event('USD'));
      page.setExchangeRate(event('80'));
      await page.fetchRate();
      expect(page.invoice().exchangeRate).toBe(80);
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('Enter it yourself'), 'danger');
    });

    it('switching back to a domestic customer restores the home currency', async () => {
      const foreign = await customers.add({
        name: 'Acme Inc', taxId: '', country: 'US', regionCode: '', email: '', phone: '', address: '',
      });
      page.setCustomer(event(foreign.id));
      page.setCustomer(event(customers.customers()[0].id));
      expect(page.invoice().currency).toBe(page.business().currency);
      expect(page.invoice().exchangeRate).toBe(1);
      expect(page.autoCurrency()).toBe(false);
    });

    it('switching back to a domestic customer undoes the automatic exemption', async () => {
      const foreign = await customers.add({
        name: 'Acme Inc', taxId: '', country: 'US', regionCode: '', email: '', phone: '', address: '',
      });
      page.setCustomer(event(foreign.id));
      page.setCustomer(event(customers.customers()[0].id));
      expect(page.invoice().taxTreatment).toBe(TaxTreatment.Standard);
    });

    it('does not undo an exemption the user chose themselves', () => {
      page.setExempt(event(true, 'checked'));
      page.setCustomer(event(customers.customers()[0].id));
      expect(page.invoice().taxTreatment).toBe(TaxTreatment.Exempt);
    });

    it('totals follow the items, with CGST + SGST for a same-state customer', async () => {
      const sameState = customers.customers().find((c) => c.regionCode === '27')!;
      page.setCustomer(event(sameState.id));
      page.setItems([{ id: 'x', description: 'Work', itemCode: '', quantity: 1, rate: 1000, taxRate: 18 }]);
      await settle();
      expect(page.totals().grandTotal).toBe(1180);
      expect(page.totalLines().map((l) => l.label)).toEqual(['CGST', 'SGST']);
      expect(fixture.nativeElement.textContent).toContain('SGST');
    });

    it('draft saves never validate and keep the invoice a draft', async () => {
      await page.saveDraft();
      expect(page.issues()).toEqual([]);
      expect(invoices.invoices()).toHaveLength(1);
      expect(invoices.invoices()[0].status).toBe(InvoiceStatus.Draft);
      expect(navigateByUrl).toHaveBeenCalledWith(`/invoices/${page.invoice().id}`, { replaceUrl: true });
      expect(page.isNew()).toBe(false);
    });

    it('validation blocks issuing and lists what is wrong', async () => {
      expect(await page.saveInvoice()).toBe(false);
      expect(page.issues().map((i) => i.field)).toContain('customer');
      expect(invoices.invoices()).toEqual([]);
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('Fix'), 'danger');
      await settle();
      expect(fixture.nativeElement.textContent).toContain('Choose a customer');
    });

    it('saves a valid invoice as unpaid', async () => {
      await fillValid();
      expect(await page.saveInvoice()).toBe(true);
      expect(invoices.invoices()[0].status).toBe(InvoiceStatus.Unpaid);
      expect(page.issues()).toEqual([]);
    });

    it('a foreign-currency invoice needs an exchange rate to be issued', async () => {
      await fillValid();
      page.setCurrency(event('USD'));
      expect(await page.saveInvoice()).toBe(false);
      expect(page.issues()[0].field).toBe('exchangeRate');
      page.setExchangeRate(event('83'));
      expect(await page.saveInvoice()).toBe(true);
    });

    it('avoids a duplicate number if another invoice took it meanwhile', async () => {
      await fillValid();
      const taken = page.invoice().number;
      await invoices.save({ ...invoices.createDraft(), id: 'other', number: taken });
      await page.saveInvoice();
      expect(page.invoice().number).not.toBe(taken);
    });

    it('marks paid and then offers no Mark paid button', async () => {
      await fillValid();
      await page.markPaid();
      expect(invoices.invoices()[0].status).toBe(InvoiceStatus.Paid);
      await settle();
      expect(fixture.nativeElement.textContent).not.toContain('Mark paid');
    });

    it('prints the paper through the print service', () => {
      page.print();
      expect(printPaper).toHaveBeenCalledTimes(1);
      expect((printPaper.mock.calls[0][0] as HTMLElement).classList.contains('paper')).toBe(true);
    });

    it('Cmd/Ctrl+S saves a draft', async () => {
      const keydown = new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true });
      page.onKeydown(keydown);
      await vi.waitFor(() => expect(invoices.invoices()).toHaveLength(1));
      expect(keydown.defaultPrevented).toBe(true);
    });

    it('ignores other keys, and shortcuts while the page is not the active one', () => {
      const other = new KeyboardEvent('keydown', { key: 's', cancelable: true });
      page.onKeydown(other);
      expect(other.defaultPrevented).toBe(false);
      page.ionViewWillLeave();
      const hidden = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
      page.onKeydown(hidden);
      expect(hidden.defaultPrevented).toBe(false);
      page.ionViewWillEnter();
    });

    it('prints when the native shell asks to', async () => {
      const shell = TestBed.inject(NativeShellService);
      await shell.start();
      window.dispatchEvent(new Event('gstdesk-print'));
      await settle();
      expect(printPaper).toHaveBeenCalledTimes(1);
    });

    it('adds a customer from the modal and selects it', async () => {
      modalResult = {
        role: 'save',
        data: { name: 'Fresh Co', taxId: '', country: 'IN', regionCode: '27', email: '', phone: '', address: '' },
      };
      await page.addCustomer();
      const created = customers.customers().find((c) => c.name === 'Fresh Co')!;
      expect(page.invoice().customerId).toBe(created.id);
    });

    it('ignores a cancelled customer modal', async () => {
      const before = customers.customers().length;
      await page.addCustomer();
      expect(customers.customers()).toHaveLength(before);
    });

    it('toggles between the edit and preview panes', async () => {
      page.setView(event('preview'));
      await settle();
      expect(fixture.nativeElement.querySelector('ion-grid').getAttribute('data-view')).toBe('preview');
      page.setView(event('edit'));
      expect(page.view()).toBe('edit');
    });

    it('renders the live paper preview', () => {
      expect(fixture.nativeElement.querySelector('app-invoice-paper .paper')).not.toBeNull();
    });
  });

  describe('existing invoice', () => {
    beforeEach(async () => {
      const draft = invoices.createDraft('2026-10-01');
      await invoices.save({ ...draft, number: 'INV/26-27/009', status: InvoiceStatus.Unpaid, customerId: customers.customers()[0].id });
      await build(draft.id);
    });

    it('loads by route id', () => {
      expect(page.isNew()).toBe(false);
      expect(page.invoice().number).toBe('INV/26-27/009');
      expect(fixture.nativeElement.textContent).toContain('INV/26-27/009');
    });

    it('editing does not touch the stored invoice until saved', () => {
      page.setNotes(event('Changed'));
      expect(invoices.invoices()[0].notes).toBe('');
    });

    it('keeps the original regime and currency snapshot even if Settings changed', async () => {
      await TestBed.inject(BusinessService).setCountry('GB');
      await build(invoices.invoices()[0].id);
      expect(page.invoice()).toMatchObject({ regime: 'IN', currency: 'INR' });
      expect(page.regime().taxName).toBe('GST');
    });

    it('delete asks first and then removes and leaves', async () => {
      confirm.mockResolvedValueOnce(false);
      await page.remove();
      expect(invoices.invoices()).toHaveLength(1);
      confirm.mockResolvedValueOnce(true);
      await page.remove();
      expect(invoices.invoices()).toHaveLength(0);
      expect(navigateByUrl).toHaveBeenCalledWith('/invoices', { replaceUrl: true });
    });

    it('saving an issued invoice keeps it unpaid', async () => {
      page.setItems([{ id: 'x', description: 'Work', itemCode: '', quantity: 1, rate: 100, taxRate: 18 }]);
      page.setNotes(event('Updated'));
      expect(await page.saveInvoice()).toBe(true);
      expect(invoices.invoices()[0]).toMatchObject({ notes: 'Updated', status: InvoiceStatus.Unpaid });
      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('an unknown invoice id sends the user back to the list', async () => {
    await build('does-not-exist');
    expect(navigateByUrl).toHaveBeenCalledWith('/invoices', { replaceUrl: true });
    expect(toast).toHaveBeenCalledWith('That invoice no longer exists', 'danger');
  });

  it('entering /invoices/new again starts a fresh draft', async () => {
    await build();
    page.setNotes(event('Leftover'));
    page.ionViewWillEnter();
    expect(page.invoice().notes).toBe('');
  });
});
