import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  contrastOutline,
  documentTextOutline,
  gridOutline,
  peopleOutline,
  settingsOutline,
} from 'ionicons/icons';
import { ThemeMode } from '../../enums/theme-mode.enum';
import { BusinessService } from '../../services/business/business.service';
import { ThemeService } from '../../services/theme/theme.service';
import { initials } from '../../utils/initials.util';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'grid-outline' },
  { label: 'Invoices', path: '/invoices', icon: 'document-text-outline' },
  { label: 'Customers', path: '/customers', icon: 'people-outline' },
  { label: 'Settings', path: '/settings', icon: 'settings-outline' },
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonAvatar, IonButton, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList,
    IonMenuToggle, IonToolbar, RouterLink, RouterLinkActive,
  ],
})
export class SidebarComponent {
  private readonly businessService = inject(BusinessService);
  private readonly theme = inject(ThemeService);
  private readonly nav = inject(NavController);

  readonly navItems = NAV_ITEMS;
  readonly business = this.businessService.business;
  readonly regime = this.businessService.regime;

  readonly businessName = computed(() => this.business().name.trim() || 'Set up your business');
  readonly initials = computed(() => initials(this.business().name));
  readonly taxIdLine = computed(() => {
    const taxId = this.business().taxId.trim();
    return taxId ? `${this.regime().taxIdLabel}: ${taxId}` : `No ${this.regime().taxIdLabel} added`;
  });

  constructor() {
    addIcons({ addOutline, contrastOutline, documentTextOutline, gridOutline, peopleOutline, settingsOutline });
  }

  newInvoice(): Promise<boolean> {
    return this.nav.navigateForward('/invoices/new');
  }

  toggleTheme(): Promise<void> {
    return this.theme.setMode(this.theme.isDark() ? ThemeMode.Light : ThemeMode.Dark);
  }
}
