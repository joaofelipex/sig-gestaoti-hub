import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDatum { label: string; value: number; color?: string }
const PALETTE = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6b7280'];

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div *ngFor="let d of data; let i = index" class="group">
        <div class="mb-1 flex justify-between text-xs text-gray-500">
          <span class="font-medium text-gray-700">{{ d.label }}</span>
          <span>{{ formatValue(d.value) }}</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200/80">
          <div class="h-full rounded-full transition-all duration-500"
               [style.width.%]="pct(d.value)"
               [style.background]="d.color || color(i)"></div>
        </div>
      </div>
      <div *ngIf="!data.length" class="py-6 text-center text-sm text-gray-400">Sem dados</div>
    </div>
  `
})
export class BarChartComponent {
  @Input() data: ChartDatum[] = [];
  @Input() prefix = '';
  get max() { return Math.max(1, ...this.data.map(d => d.value)); }
  pct(v: number) { return (v / this.max) * 100; }
  color(i: number) { return PALETTE[i % PALETTE.length]; }
  formatValue(v: number) { return this.prefix + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-chart-donut flex items-center gap-6">
      <svg viewBox="0 0 42 42" class="h-32 w-32 shrink-0 -rotate-90">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3f4f6" stroke-width="6"></circle>
        <circle *ngFor="let s of segments"
                cx="21" cy="21" r="15.915" fill="transparent"
                [attr.stroke]="s.color" stroke-width="6"
                [attr.stroke-dasharray]="s.dash"
                [attr.stroke-dashoffset]="s.offset"></circle>
      </svg>
      <div class="sig-chart-donut__legend min-w-0 flex-1 space-y-1">
        <div *ngFor="let d of data; let i = index" class="flex items-center justify-between gap-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-sm" [style.background]="d.color || color(i)"></span>
            <span class="text-gray-600">{{ d.label }}</span>
          </div>
          <span class="font-semibold text-gray-900">{{ d.value }}</span>
        </div>
        <div *ngIf="!data.length" class="text-sm text-gray-400">Sem dados</div>
      </div>
    </div>
  `
})
export class DonutChartComponent {
  @Input() data: ChartDatum[] = [];
  get total() { return Math.max(1, this.data.reduce((s, d) => s + d.value, 0)); }
  color(i: number) { return PALETTE[i % PALETTE.length]; }
  get segments() {
    let acc = 0; const C = 100;
    return this.data.map((d, i) => {
      const pct = (d.value / this.total) * C;
      const s = { color: d.color || this.color(i), dash: `${pct} ${C - pct}`, offset: C - acc };
      acc += pct; return s;
    });
  }
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-chart-line">
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="h-40 w-full min-w-[280px]">
      <polyline [attr.points]="path" fill="none" stroke="#3b82f6" stroke-width="2" />
      <polygon [attr.points]="area" fill="url(#grad)" opacity="0.2" />
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g *ngFor="let p of points; let i = index">
        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" fill="#3b82f6"/>
        <text [attr.x]="p.x" [attr.y]="H - 4" font-size="9" text-anchor="middle" fill="#6b7280">{{ data[i]?.label }}</text>
      </g>
    </svg>
    </div>
    <div *ngIf="!data.length" class="py-6 text-center text-sm text-gray-400">Sem dados</div>
  `
})
export class LineChartComponent {
  @Input() data: ChartDatum[] = [];
  W = 400; H = 160;
  get max() { return Math.max(1, ...this.data.map(d => d.value)); }
  get points() {
    if (!this.data.length) return [];
    const pad = 20, w = this.W - pad * 2, h = this.H - 30;
    return this.data.map((d, i) => ({
      x: pad + (i / Math.max(1, this.data.length - 1)) * w,
      y: 10 + h - (d.value / this.max) * h
    }));
  }
  get path() { return this.points.map(p => `${p.x},${p.y}`).join(' '); }
  get area() {
    const pts = this.points; if (!pts.length) return '';
    return `${pts[0].x},${this.H - 20} ${this.path} ${pts[pts.length - 1].x},${this.H - 20}`;
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
  `
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
