import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList, IonNote, IonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { square } from 'ionicons/icons';
import { donutArcs } from '../../utils/chart.util';
import { formatMoneyCompact } from '../../utils/money.util';

export interface DonutSegment {
  label: string;
  value: number;
}

const CIRCUMFERENCE = 100;
const COLOR_COUNT = 5;

/** Hand-written SVG donut. The circle radius makes its circumference exactly 100, so dashes are percentages. */
@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.component.html',
  styleUrls: ['./donut-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonItem, IonLabel, IonList, IonNote, IonText],
})
export class DonutChartComponent {
  constructor() {
    addIcons({ square });
  }

  readonly segments = input.required<DonutSegment[]>();
  readonly currency = input.required<string>();
  readonly locale = input.required<string>();
  readonly centerLabel = input('Total');

  readonly total = computed(() => this.segments().reduce((sum, s) => sum + Math.max(s.value, 0), 0));
  readonly totalLabel = computed(() => formatMoneyCompact(this.total(), this.currency(), this.locale()));

  readonly arcs = computed(() =>
    donutArcs(
      this.segments().map((s) => s.value),
      CIRCUMFERENCE,
    ).map((arc) => ({
      ...arc,
      dashArray: `${arc.dash} ${arc.gap}`,
      dashOffset: 25 + arc.offset,
      color: this.color(arc.index),
    })),
  );

  readonly legend = computed(() =>
    this.segments().map((segment, index) => ({
      label: segment.label,
      color: this.color(index),
      amount: formatMoneyCompact(segment.value, this.currency(), this.locale()),
      percent: `${this.total() > 0 ? Math.round((Math.max(segment.value, 0) / this.total()) * 100) : 0}%`,
    })),
  );

  private color(index: number): string {
    return `var(--app-chart-${(index % COLOR_COUNT) + 1})`;
  }
}
