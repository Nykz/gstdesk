import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonRow,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, checkmarkCircle, createOutline, mailOutline, trashOutline } from 'ionicons/icons';
import { CustomerFormComponent, CustomerDraft } from '../../components/customer-form/customer-form.component';
import { Customer } from '../../interfaces/customer.interface';
import { BusinessService } from '../../services/business/business.service';
import { CustomerService } from '../../services/customer/customer.service';
import { InvoiceService } from '../../services/invoice/invoice.service';
import { NotifyService } from '../../services/notify/notify.service';
import { countryName } from '../../utils/countries';
import { eventValue } from '../../utils/event.util';
import { initials } from '../../utils/initials.util';
import { regionName } from '../../utils/tax-regimes';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonAvatar, IonButton, IonButtons, IonCard, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonItem,
    IonLabel, IonList, IonMenuButton, IonRow, IonSearchbar, IonText, IonTitle, IonToolbar,
  ],
})
export class CustomersPage {
  private readonly customerService = inject(CustomerService);
  private readonly businessService = inject(BusinessService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly modalController = inject(ModalController);
  private readonly notify = inject(NotifyService);

  readonly query = signal('');
  readonly regime = this.businessService.regime;

  readonly cards = computed(() => {
    const query = this.query().trim().toLowerCase();
    const regime = this.regime();
    const invoices = this.invoiceService.invoices();
    return this.customerService
      .customers()
      .filter((c) => !query || [c.name, c.taxId, c.email].some((field) => field.toLowerCase().includes(query)))
      .map((customer) => {
        const domestic = regime.domesticCountries.includes(customer.country);
        const region = domestic && customer.regionCode ? regionName(regime, customer.regionCode) : '';
        return {
          customer,
          initials: initials(customer.name),
          invoiceCount: invoices.filter((invoice) => invoice.customerId === customer.id).length,
          place: region || countryName(customer.country),
          taxIdLine: customer.taxId ? `${regime.taxIdLabel}: ${customer.taxId}` : 'Unregistered',
        };
      });
  });

  readonly total = computed(() => this.customerService.customers().length);

  constructor() {
    addIcons({ addOutline, checkmarkCircle, createOutline, mailOutline, trashOutline });
  }

  setQuery(event: Event): void {
    this.query.set(eventValue(event));
  }

  add(): Promise<void> {
    return this.openForm(undefined);
  }

  edit(customer: Customer): Promise<void> {
    return this.openForm(customer);
  }

  async remove(customer: Customer): Promise<void> {
    const confirmed = await this.notify.confirm(
      'Delete customer?',
      `${customer.name} will be removed. Their existing invoices are kept.`,
    );
    if (!confirmed) return;
    await this.customerService.remove(customer.id);
    await this.notify.toast('Customer deleted');
  }

  private async openForm(customer: Customer | undefined): Promise<void> {
    const modal = await this.modalController.create({
      component: CustomerFormComponent,
      componentProps: { customer },
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<CustomerDraft | Customer>();
    if (role !== 'save' || !data) return;
    if (customer) await this.customerService.update(data as Customer);
    else await this.customerService.add(data as CustomerDraft);
    await this.notify.toast(customer ? 'Customer updated' : 'Customer added', 'success');
  }
}
