import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDatum { label: string; value: number; color?: string }

const PALETTE = ['#023ed8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

let lineChartSeq = 0;

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-chart-bars" *ngIf="data.length; else empty">
      <div class="sig-chart-bar" *ngFor="let d of data; let i = index">
        <div class="sig-chart-bar__head">
          <span class="sig-chart-bar__label">{{ d.label }}</span>
          <span class="sig-chart-bar__values">
            <strong>{{ formatValue(d.value) }}</strong>
            <span *ngIf="showShare" class="sig-chart-bar__pct">{{ share(d.value) }}%</span>
          </span>
        </div>
        <div class="sig-chart-bar__track" role="presentation">
          <div
            class="sig-chart-bar__fill"
            [style.width.%]="pct(d.value)"
            [style.background]="barFill(d.color || color(i))"
          ></div>
        </div>
      </div>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class BarChartComponent {
  @Input() data: ChartDatum[] = [];
  @Input() prefix = '';
  @Input() showShare = true;

  get max() {
    return Math.max(1, ...this.data.map((d) => d.value));
  }

  get total() {
    return this.data.reduce((s, d) => s + d.value, 0);
  }

  pct(v: number) {
    return (v / this.max) * 100;
  }

  share(v: number) {
    return this.total ? Math.round((v / this.total) * 100) : 0;
  }

  color(i: number) {
    return PALETTE[i % PALETTE.length];
  }

  barFill(hex: string) {
    return `linear-gradient(90deg, ${hex} 0%, ${hex}cc 100%)`;
  }

  formatValue(v: number) {
    return this.prefix + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-chart-donut" *ngIf="data.length; else empty">
      <div class="sig-chart-donut__ring">
        <svg viewBox="0 0 42 42" class="sig-chart-donut__svg sig-chart-donut__svg--ring" aria-hidden="true">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sig-chart-track)" stroke-width="5.5"></circle>
          <circle
            *ngFor="let s of segments"
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            [attr.stroke]="s.color"
            stroke-width="5.5"
            [attr.stroke-dasharray]="s.dash"
            [attr.stroke-dashoffset]="s.offset"
            class="sig-chart-donut__segment"
          ></circle>
        </svg>
        <div class="sig-chart-donut__center">
          <strong class="sig-chart-donut__total">{{ centerValue ?? total }}</strong>
          <span class="sig-chart-donut__center-label">{{ centerLabel }}</span>
        </div>
      </div>
      <div class="sig-chart-donut__legend">
        <div *ngFor="let d of data; let i = index" class="sig-chart-donut__row">
          <span class="sig-chart-donut__swatch" [style.background]="d.color || color(i)"></span>
          <span class="sig-chart-donut__name">{{ d.label }}</span>
          <span class="sig-chart-donut__stat">
            <strong>{{ d.value }}</strong>
            <span class="sig-chart-donut__pct">{{ share(d.value) }}%</span>
          </span>
        </div>
      </div>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class DonutChartComponent {
  @Input() data: ChartDatum[] = [];
  @Input() centerLabel = 'Total';
  @Input() centerValue: string | number | null = null;

  get total() {
    return this.data.reduce((s, d) => s + d.value, 0);
  }

  color(i: number) {
    return PALETTE[i % PALETTE.length];
  }

  share(v: number) {
    const t = Math.max(1, this.total);
    return Math.round((v / t) * 100);
  }

  get segments() {
    const sum = Math.max(1, this.total);
    let acc = 0;
    const C = 100;
    return this.data.map((d, i) => {
      const pct = (d.value / sum) * C;
      const seg = {
        color: d.color || this.color(i),
        dash: `${pct} ${C - pct}`,
        offset: C - acc,
      };
      acc += pct;
      return seg;
    });
  }
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-chart-line" *ngIf="data.length; else empty">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="sig-chart-line__svg" role="img">
        <defs>
          <linearGradient [attr.id]="gradId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" [attr.stop-color]="strokeColor" stop-opacity="0.35" />
            <stop offset="100%" [attr.stop-color]="strokeColor" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="sig-chart-line__grid">
          <line
            *ngFor="let t of yTicks"
            [attr.x1]="padX"
            [attr.x2]="W - padX"
            [attr.y1]="yAt(t)"
            [attr.y2]="yAt(t)"
          />
        </g>
        <g class="sig-chart-line__ylabels">
          <text
            *ngFor="let t of yTicks"
            [attr.x]="padX - 6"
            [attr.y]="yAt(t) + 3"
            text-anchor="end"
          >{{ formatTick(t) }}</text>
        </g>
        <polygon [attr.points]="area" [attr.fill]="'url(#' + gradId + ')'" />
        <polyline [attr.points]="path" fill="none" [attr.stroke]="strokeColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <g *ngFor="let p of points; let i = index" class="sig-chart-line__point">
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" [attr.fill]="strokeColor" stroke="#fff" stroke-width="2" />
          <text [attr.x]="p.x" [attr.y]="p.y - 8" text-anchor="middle" class="sig-chart-line__value">{{ formatValue(data[i].value) }}</text>
          <text [attr.x]="p.x" [attr.y]="H - 6" text-anchor="middle" class="sig-chart-line__month">{{ data[i].label }}</text>
        </g>
      </svg>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class LineChartComponent {
  @Input() data: ChartDatum[] = [];
  @Input() prefix = '';
  @Input() strokeColor = '#023ed8';

  readonly gradId = `sig-line-grad-${++lineChartSeq}`;
  W = 420;
  H = 176;
  padX = 44;
  padTop = 22;
  padBottom = 28;

  get max() {
    return Math.max(1, ...this.data.map((d) => d.value));
  }

  get yTicks(): number[] {
    const m = this.max;
    if (m <= 0) return [0];
    const step = m <= 4 ? 1 : m <= 20 ? 5 : m <= 100 ? 25 : m <= 1000 ? 250 : Math.ceil(m / 4 / 1000) * 1000;
    const ticks: number[] = [];
    for (let v = 0; v <= m; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== m) ticks.push(m);
    return ticks.slice(-5);
  }

  yAt(value: number) {
    const h = this.H - this.padTop - this.padBottom;
    return this.padTop + h - (value / this.max) * h;
  }

  get points() {
    if (!this.data.length) return [];
    const w = this.W - this.padX * 2;
    const h = this.H - this.padTop - this.padBottom;
    return this.data.map((d, i) => ({
      x: this.padX + (i / Math.max(1, this.data.length - 1)) * w,
      y: this.padTop + h - (d.value / this.max) * h,
    }));
  }

  get path() {
    return this.points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  get area() {
    const pts = this.points;
    if (!pts.length) return '';
    const base = this.H - this.padBottom;
    return `${pts[0].x},${base} ${this.path} ${pts[pts.length - 1].x},${base}`;
  }

  formatTick(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mi`;
    if (v >= 1_000) return `${Math.round(v / 1_000)} mil`;
    return String(v);
  }

  formatValue(v: number) {
    if (v >= 1_000_000) return this.prefix + (v / 1_000_000).toFixed(1) + ' mi';
    if (v >= 10_000) return this.prefix + Math.round(v / 1_000) + ' mil';
    return this.prefix + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-kpi-card">
      <div class="sig-kpi-card__body">
        <div class="sig-kpi-card__text">
          <p class="sig-kpi-card__label">{{ label }}</p>
          <p class="sig-kpi-card__value" [style.color]="color">{{ value }}</p>
          <p *ngIf="hint" class="sig-kpi-card__hint">{{ hint }}</p>
        </div>
        <div
          class="sig-kpi-card__icon"
          [style.color]="color"
          [style.background]="tintBg"
          [style.borderColor]="tintBorder"
        >
          <i [class]="icon" aria-hidden="true"></i>
        </div>
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() icon = 'fas fa-chart-line';
  @Input() color = '#3b82f6';
  @Input() hint = '';

  get tintBg(): string {
    return `${this.color}18`;
  }

  get tintBorder(): string {
    return `${this.color}28`;
  }
}
