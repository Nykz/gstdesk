import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { TaxEngine } from '../../enums/tax-engine.enum';
import { InvoiceItem } from '../../interfaces/invoice.interface';
import { TaxRegime } from '../../interfaces/tax-regime.interface';
import { eventNumber, eventValue } from '../../utils/event.util';
import { newId } from '../../utils/id.util';
import { formatAmount } from '../../utils/money.util';
import { lineTaxable } from '../../utils/tax-engine.util';
import { BusinessService } from '../../services/business/business.service';

/** Line-item rows. The tax rate is a select for fixed-rate regimes and a number input for manual-rate ones. */
@Component({
  selector: 'app-invoice-items',
  templateUrl: './invoice-items.component.html',
  styleUrls: ['./invoice-items.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCol, IonGrid, IonIcon, IonInput, IonItem,
    IonLabel, IonRow, IonSelect, IonSelectOption, IonText,
  ],
})
export class InvoiceItemsComponent {
  private readonly business = inject(BusinessService);

  readonly items = model.required<InvoiceItem[]>();
  readonly regime = input.required<TaxRegime>();
  readonly locale = input.required<string>();
  /** Exempt invoices charge no tax, so the rate column is hidden. */
  readonly exempt = input(false);
  readonly currency = input('');

  readonly rateAsSelect = computed(() => this.regime().engine !== TaxEngine.ManualRate);

  readonly rows = computed(() =>
    this.items().map((item) => ({ item, amount: formatAmount(lineTaxable(item), this.locale()) })),
  );

  constructor() {
    addIcons({ addOutline, trashOutline });
  }

  add(): void {
    const defaultRate = this.business.business().defaultTaxRate;
    this.items.update((items) => [
      ...items,
      { id: newId('item'), description: '', itemCode: '', quantity: 1, rate: 0, taxRate: defaultRate },
    ]);
  }

  remove(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  setText(id: string, field: 'description' | 'itemCode', event: Event): void {
    this.patch(id, { [field]: eventValue(event) });
  }

  setNumber(id: string, field: 'quantity' | 'rate' | 'taxRate', event: Event): void {
    this.patch(id, { [field]: eventNumber(event) });
  }

  private patch(id: string, changes: Partial<InvoiceItem>): void {
    this.items.update((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }
}
