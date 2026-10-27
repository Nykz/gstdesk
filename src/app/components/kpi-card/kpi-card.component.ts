import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, receiptOutline, timeOutline } from 'ionicons/icons';

export type KpiTone = 'success' | 'warning' | 'danger';

/** One headline figure: label, icon tile, big value and a caption underneath. */
@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonIcon],
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly caption = input('');
  readonly icon = input('receipt-outline');
  readonly tone = input<KpiTone>('success');
  /** Colour the figure itself (used for overdue money). */
  readonly alert = input(false);

  constructor() {
    addIcons({ alertCircleOutline, receiptOutline, timeOutline });
  }
}
