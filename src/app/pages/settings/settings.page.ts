import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  downloadOutline,
  informationCircleOutline,
  refreshOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';
import { ThemeMode } from '../../enums/theme-mode.enum';
import { Business } from '../../interfaces/business.interface';
import { BackupService } from '../../services/backup/backup.service';
import { BusinessService } from '../../services/business/business.service';
import { DemoDataService } from '../../services/demo-data/demo-data.service';
import { NotifyService } from '../../services/notify/notify.service';
import { ThemeService } from '../../services/theme/theme.service';
import { switchCountry } from '../../utils/business.util';
import { CURRENCIES } from '../../utils/countries';
import { todayIso } from '../../utils/date.util';
import { nextInvoiceNumber } from '../../utils/invoice-number.util';
import { eventNumber, eventValue } from '../../utils/event.util';
import { stateCodeFromGstin } from '../../utils/gstin.util';
import { normalizeTaxId, taxIdError } from '../../utils/tax-id.util';
import { TAX_REGIMES, getRegime, hasRegions, withCustomTaxName } from '../../utils/tax-regimes';

type TextField = {
  [K in keyof Business]: Business[K] extends string ? K : never;
}[keyof Business];

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCol,
    IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonMenuButton, IonRow, IonSegment,
    IonSegmentButton, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle, IonToolbar,
  ],
})
export class SettingsPage {
  private readonly businessService = inject(BusinessService);
  private readonly themeService = inject(ThemeService);
  private readonly backup = inject(BackupService);
  private readonly demoData = inject(DemoDataService);
  private readonly notify = inject(NotifyService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly regimes = TAX_REGIMES;
  readonly currencies = CURRENCIES;
  readonly themeModes = [
    { value: ThemeMode.System, label: 'System' },
    { value: ThemeMode.Light, label: 'Light' },
    { value: ThemeMode.Dark, label: 'Dark' },
  ];
  readonly themeMode = this.themeService.mode;

  /** Editable copy of the business; resets whenever the stored business changes. */
  readonly form = linkedSignal(() => this.businessService.business());

  readonly regime = computed(() =>
    withCustomTaxName(getRegime(this.form().country), this.form().customTaxName),
  );
  readonly showRegion = computed(() => hasRegions(this.regime()));
  readonly rateAsSelect = computed(() => this.regime().rates.length > 0);
  readonly taxIdError = computed(() => taxIdError(this.regime(), this.form().taxId));
  /** Sample number shown under the prefix field. */
  readonly numberExample = computed(() =>
    nextInvoiceNumber(this.form().invoicePrefix || 'INV', todayIso(), this.regime().fiscalYearStartMonth, []),
  );
  readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.businessService.business()));

  constructor() {
    addIcons({ cloudUploadOutline, downloadOutline, informationCircleOutline, refreshOutline, saveOutline, trashOutline });
  }

  setText(field: TextField, event: Event): void {
    this.form.update((form) => ({ ...form, [field]: eventValue(event) }));
  }

  setDefaultRate(event: Event): void {
    this.form.update((form) => ({ ...form, defaultTaxRate: eventNumber(event) }));
  }

  /** A valid GSTIN fills the state from its first two digits. */
  setTaxId(event: Event): void {
    const taxId = normalizeTaxId(eventValue(event));
    const state = this.regime().code === 'IN' ? stateCodeFromGstin(taxId) : null;
    this.form.update((form) => ({ ...form, taxId, ...(state ? { regionCode: state } : {}) }));
  }

  /** Changing the country resets currency, region, default rate, tax ID and bank codes. */
  setCountry(event: Event): void {
    this.form.update((form) => switchCountry(form, eventValue(event)));
  }

  async save(): Promise<void> {
    if (this.taxIdError()) {
      await this.notify.toast(this.taxIdError()!, 'danger');
      return;
    }
    await this.businessService.replace(this.form());
    await this.notify.toast('Settings saved', 'success');
  }

  async setTheme(event: Event): Promise<void> {
    await this.themeService.setMode(eventValue(event) as ThemeMode);
  }

  async exportBackup(): Promise<void> {
    try {
      const name = await this.backup.download();
      await this.notify.toast(`Saved ${name}`, 'success');
    } catch (error) {
      // Closing the share sheet without choosing anything is not a failure.
      if (error instanceof Error && /cancel/i.test(error.message)) return;
      await this.notify.toast('Could not export the backup.', 'danger');
    }
  }

  chooseBackup(): void {
    this.fileInput()?.nativeElement.click();
  }

  async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.backup.restore(await file.text());
      await this.notify.toast('Backup restored', 'success');
    } catch (error) {
      await this.notify.toast(error instanceof Error ? error.message : 'Could not read that file.', 'danger');
    } finally {
      input.value = '';
    }
  }

  async loadDemo(): Promise<void> {
    const ok = await this.notify.confirm(
      'Load demo data?',
      'This replaces your business, customers and invoices with sample data.',
      'Load demo',
    );
    if (!ok) return;
    await this.demoData.loadDemo();
    await this.notify.toast('Demo data loaded', 'success');
  }

  async startFresh(): Promise<void> {
    const ok = await this.notify.confirm(
      'Start fresh?',
      'This permanently deletes your business details, customers and invoices. Export a backup first if you need one.',
      'Delete everything',
    );
    if (!ok) return;
    await this.demoData.startFresh();
    await this.notify.toast('All data cleared');
  }
}
