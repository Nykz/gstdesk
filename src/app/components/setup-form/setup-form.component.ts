import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { SetupService } from '../../services/setup/setup.service';
import { CURRENCIES } from '../../utils/countries';
import { eventValue } from '../../utils/event.util';
import { guessRegime } from '../../utils/locale.util';
import { TAX_REGIMES, getRegime } from '../../utils/tax-regimes';

/** First launch: the owner picks their country and home currency (nothing is assumed). */
@Component({
  selector: 'app-setup-form',
  templateUrl: './setup-form.component.html',
  styleUrls: ['./setup-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton, IonContent, IonFooter, IonHeader, IonInput, IonSelect, IonSelectOption, IonTitle, IonToolbar,
  ],
})
export class SetupFormComponent {
  private readonly setup = inject(SetupService);
  private readonly modalController = inject(ModalController);

  readonly regimes = TAX_REGIMES;

  readonly name = signal('');
  readonly country = signal(guessRegime(typeof navigator === 'undefined' ? '' : navigator.language));
  private readonly chosenCurrency = signal<string | undefined>(undefined);
  readonly submitted = signal(false);

  readonly regime = computed(() => getRegime(this.country()));
  /** The country's own currency until the owner picks another one. */
  readonly currency = computed(() => this.chosenCurrency() ?? this.regime().currency);
  /** The country's currency is always offered, even if it is not one of the usual invoice currencies. */
  readonly currencies = computed(() => Array.from(new Set([this.regime().currency, ...CURRENCIES])));
  readonly nameError = computed(() => this.submitted() && !this.name().trim());

  setName(event: Event): void {
    this.name.set(eventValue(event));
  }

  setCountry(event: Event): void {
    this.country.set(eventValue(event));
    this.chosenCurrency.set(undefined);
  }

  setCurrency(event: Event): void {
    this.chosenCurrency.set(eventValue(event));
  }

  async start(): Promise<void> {
    this.submitted.set(true);
    if (!this.name().trim()) return;
    await this.setup.complete({ name: this.name(), country: this.country(), currency: this.currency() });
    await this.modalController.dismiss(null, 'start');
  }

  async useSampleData(): Promise<void> {
    await this.setup.useSampleData();
    await this.modalController.dismiss(null, 'sample');
  }
}
