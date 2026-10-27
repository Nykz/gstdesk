import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { square } from 'ionicons/icons';
import { MonthBar } from '../../interfaces/dashboard.interface';
import { axisTicks, niceMax } from '../../utils/chart.util';
import { formatMoney, formatMoneyCompact } from '../../utils/money.util';

const WIDTH = 560;
const HEIGHT = 240;
const PAD = { left: 56, right: 8, top: 12, bottom: 28 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Hand-written SVG grouped bar chart: billed vs collected per month. */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonItem, IonLabel, IonList],
})
export class BarChartComponent {
  constructor() {
    addIcons({ square });
  }

  readonly bars = input.required<MonthBar[]>();
  readonly currency = input.required<string>();
  readonly locale = input.required<string>();

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly plotLeft = PAD.left;
  readonly plotRight = WIDTH - PAD.right;
  readonly baseline = PAD.top + PLOT_H;

  readonly max = computed(() => niceMax(Math.max(0, ...this.bars().flatMap((b) => [b.billed, b.collected]))));

  readonly ticks = computed(() =>
    axisTicks(this.max()).map((value) => ({
      y: PAD.top + PLOT_H - (value / this.max()) * PLOT_H,
      label: formatMoneyCompact(value, this.currency(), this.locale()),
    })),
  );

  readonly groups = computed(() => {
    const bars = this.bars();
    const slot = PLOT_W / Math.max(bars.length, 1);
    const barWidth = Math.min(slot * 0.5, 64);
    const heightOf = (value: number) => (value / this.max()) * PLOT_H;
    return bars.map((bar, i) => {
      const center = PAD.left + slot * i + slot / 2;
      return {
        label: bar.label,
        center,
        title: `${bar.label}: billed ${formatMoney(bar.billed, this.currency(), this.locale())}, collected ${formatMoney(bar.collected, this.currency(), this.locale())}`,
        barWidth,
        billed: { x: center - barWidth / 2, height: heightOf(bar.billed) },
        collected: { x: center - barWidth / 2, height: heightOf(bar.collected) },
      };
    });
  });
}
