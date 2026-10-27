import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonBadge } from '@ionic/angular';
import { DisplayStatus } from '../../enums/invoice-status.enum';

const LABELS: Record<DisplayStatus, string> = {
  draft: 'Draft',
  unpaid: 'Unpaid',
  paid: 'Paid',
  overdue: 'Overdue',
};

const COLORS: Record<DisplayStatus, string> = {
  draft: 'medium',
  unpaid: 'warning',
  paid: 'success',
  overdue: 'danger',
};

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonBadge],
})
export class StatusBadgeComponent {
  readonly status = input.required<DisplayStatus>();

  readonly label = computed(() => LABELS[this.status()]);
  readonly color = computed(() => COLORS[this.status()]);
}
