import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { Customer } from '../../interfaces/customer.interface';
import { BusinessService } from '../../services/business/business.service';
import { COUNTRIES } from '../../utils/countries';
import { eventValue } from '../../utils/event.util';
import { stateCodeFromGstin } from '../../utils/gstin.util';
import {
  FOREIGN_TAX_ID_PLACEHOLDER,
  customerTaxIdLabel,
  isTaxIdValid,
  normalizeTaxId,
} from '../../utils/tax-id.util';
import { hasRegions, isDomesticCountry } from '../../utils/tax-regimes';

export type CustomerDraft = Omit<Customer, 'id'>;

const EMPTY: CustomerDraft = {
  name: '', taxId: '', country: 'IN', regionCode: '', email: '', phone: '', address: '',
};

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonInput, IonSelect,
    IonSelectOption, IonTextarea, IonTitle, IonToolbar,
  ],
})
export class CustomerFormComponent {
  // `modal` is a reserved property name on ion-modal content, so this one is named differently.
  private readonly modalController = inject(ModalController);
  private readonly businessService = inject(BusinessService);

  private readonly saved = signal<Customer | undefined>(undefined);

  /**
   * Set through the modal's componentProps when editing. The modal assigns the property directly,
   * which would overwrite a signal input, so it is a plain accessor over a private signal.
   */
  get customer(): Customer | undefined {
    return this.saved();
  }
  set customer(value: Customer | undefined) {
    this.saved.set(value);
  }

  readonly countries = COUNTRIES;
  readonly regime = this.businessService.regime;

  private readonly edits = signal<Partial<CustomerDraft>>({});
  readonly submitted = signal(false);

  readonly form = computed<CustomerDraft>(() => {
    const { id: _id, ...saved } = this.saved() ?? { id: '', ...EMPTY, country: this.regime().defaultCountry };
    return { ...saved, ...this.edits() };
  });

  readonly isEdit = computed(() => this.saved() !== undefined);
  readonly domestic = computed(() => isDomesticCountry(this.regime(), this.form().country));
  readonly showRegion = computed(() => this.domestic() && hasRegions(this.regime()));
  readonly nameError = computed(() => this.submitted() && !this.form().name.trim());
  readonly taxIdError = computed(() => !isTaxIdValid(this.regime(), this.form().taxId, this.domestic()));
  readonly taxIdLabel = computed(() => customerTaxIdLabel(this.regime(), this.domestic()));
  readonly taxIdPlaceholder = computed(() =>
    this.domestic() ? this.regime().taxIdPlaceholder : FOREIGN_TAX_ID_PLACEHOLDER,
  );

  setText(field: keyof CustomerDraft, event: Event): void {
    this.set(field, eventValue(event));
  }

  setTaxId(event: Event): void {
    const taxId = normalizeTaxId(eventValue(event));
    const state = this.regime().code === 'IN' && this.domestic() ? stateCodeFromGstin(taxId) : null;
    this.edits.update((e) => ({ ...e, taxId, ...(state ? { regionCode: state } : {}) }));
  }

  setCountry(event: Event): void {
    this.edits.update((e) => ({ ...e, country: eventValue(event), regionCode: '' }));
  }

  cancel(): Promise<boolean> {
    return this.modalController.dismiss(null, 'cancel');
  }

  async save(): Promise<void> {
    this.submitted.set(true);
    if (this.nameError() || this.taxIdError()) return;
    const form = this.form();
    const draft: CustomerDraft = {
      ...form,
      name: form.name.trim(),
      regionCode: this.showRegion() ? form.regionCode : '',
    };
    const existing = this.saved();
    await this.modalController.dismiss(existing ? { ...draft, id: existing.id } : draft, 'save');
  }

  private set(field: keyof CustomerDraft, value: string): void {
    this.edits.update((e) => ({ ...e, [field]: value }));
  }
}
