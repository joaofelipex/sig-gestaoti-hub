import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface ChartSeries {
  label: string;
  color?: string;
  data: ChartDatum[];
}

const PALETTE = ['#023ed8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

const AXIS_COLOR = '#64748b';
const GRID_COLOR = '#e8ecf4';
const LABEL_FONT = 'inherit';

function formatNum(v: number, prefix = '', suffix = ''): string {
  if (suffix === '%') return `${Math.round(v)}%`;
  if (v >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 10_000) return `${prefix}${Math.round(v / 1_000)} mil`;
  return `${prefix}${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}${suffix}`;
}

function baseChart(type: ApexChart['type'], height = 280): ApexChart {
  return {
    type,
    height,
    fontFamily: LABEL_FONT,
    foreColor: AXIS_COLOR,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: {
      enabled: true,
      speed: 650,
      animateGradually: { enabled: true, delay: 80 },
      dynamicAnimation: { enabled: true, speed: 280 },
    },
  };
}

function baseGrid(): ApexGrid {
  return {
    borderColor: GRID_COLOR,
    strokeDashArray: 4,
    padding: { left: 8, right: 8 },
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };
}

function baseTooltip(prefix = '', suffix = ''): ApexTooltip {
  return {
    theme: 'light',
    style: { fontSize: '12px' },
    y: {
      formatter: (val: number) => formatNum(val, prefix, suffix),
    },
  };
}

function colorAt(i: number, override?: string): string {
  return override || PALETTE[i % PALETTE.length];
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  template: `
    <div class="sig-apex" *ngIf="data.length; else empty">
      <apx-chart
        [series]="series"
        [chart]="chart"
        [plotOptions]="plotOptions"
        [colors]="colors"
        [dataLabels]="dataLabels"
        [xaxis]="xaxis"
        [yaxis]="yaxis"
        [grid]="grid"
        [tooltip]="tooltip"
        [legend]="legend"
      ></apx-chart>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class BarChartComponent implements OnChanges {
  @Input() data: ChartDatum[] = [];
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() showShare = true;

  series: ApexAxisChartSeries = [];
  chart: ApexChart = baseChart('bar', Math.max(220, 48 + this.data.length * 44));
  plotOptions: ApexPlotOptions = {};
  colors: string[] = [];
  dataLabels: ApexDataLabels = {};
  xaxis: ApexXAxis = {};
  yaxis: ApexYAxis = {};
  grid: ApexGrid = baseGrid();
  tooltip: ApexTooltip = baseTooltip();
  legend: ApexLegend = { show: false };

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const labels = this.data.map((d) => d.label);
    const values = this.data.map((d) => d.value);
    const total = values.reduce((s, v) => s + v, 0);
    const prefix = this.prefix;
    const suffix = this.suffix;
    const showShare = this.showShare;

    this.colors = this.data.map((d, i) => colorAt(i, d.color));
    this.chart = {
      ...baseChart('bar', Math.max(220, 56 + this.data.length * 42)),
      stacked: false,
    };
    this.plotOptions = {
      bar: {
        horizontal: true,
        borderRadius: 6,
        borderRadiusApplication: 'end',
        barHeight: '62%',
        distributed: true,
        dataLabels: { position: 'top' },
      },
    };
    this.series = [{ name: 'Valor', data: values }];
    this.dataLabels = {
      enabled: true,
      offsetX: 8,
      style: { fontSize: '11px', fontWeight: 700, colors: ['#334155'] },
      formatter: (val: string | number | number[]) => {
        const n = typeof val === 'number' ? val : Number(val);
        const base = formatNum(n, prefix, suffix);
        if (!showShare || !total) return base;
        return `${base} · ${Math.round((n / total) * 100)}%`;
      },
    };
    this.xaxis = {
      categories: labels,
      labels: {
        style: { colors: AXIS_COLOR, fontSize: '11px' },
        formatter: (val: string) => formatNum(Number(val) || 0, prefix, suffix),
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
    this.yaxis = {
      labels: {
        style: { colors: AXIS_COLOR, fontSize: '12px', fontWeight: 600 },
        maxWidth: 140,
      },
    };
    this.grid = {
      ...baseGrid(),
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    };
    this.tooltip = {
      ...baseTooltip(prefix, suffix),
      y: {
        formatter: (val: number) => {
          const base = formatNum(val, prefix, suffix);
          if (!showShare || !total) return base;
          return `${base} (${Math.round((val / total) * 100)}%)`;
        },
      },
    };
    this.legend = { show: false };
  }
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  template: `
    <div class="sig-apex sig-apex--donut" *ngIf="data.length; else empty">
      <apx-chart
        [series]="series"
        [chart]="chart"
        [labels]="labels"
        [colors]="colors"
        [plotOptions]="plotOptions"
        [dataLabels]="dataLabels"
        [legend]="legend"
        [stroke]="stroke"
        [tooltip]="tooltip"
      ></apx-chart>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class DonutChartComponent implements OnChanges {
  @Input() data: ChartDatum[] = [];
  @Input() centerLabel = 'Total';
  @Input() centerValue: string | number | null = null;

  series: ApexNonAxisChartSeries = [];
  chart: ApexChart = baseChart('donut', 280);
  labels: string[] = [];
  colors: string[] = [];
  plotOptions: ApexPlotOptions = {};
  dataLabels: ApexDataLabels = { enabled: false };
  legend: ApexLegend = {};
  stroke: ApexStroke = { width: 2, colors: ['#fff'] };
  tooltip: ApexTooltip = {};

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const total = this.data.reduce((s, d) => s + d.value, 0);
    const centerText =
      this.centerValue != null
        ? String(this.centerValue)
        : total.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    const centerLabel = this.centerLabel;

    this.series = this.data.map((d) => d.value);
    this.labels = this.data.map((d) => d.label);
    this.colors = this.data.map((d, i) => colorAt(i, d.color));
    this.chart = baseChart('donut', 280);
    this.plotOptions = {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '11px',
              fontWeight: 700,
              color: AXIS_COLOR,
              offsetY: 18,
            },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: -8,
              formatter: () => centerText,
            },
            total: {
              show: true,
              showAlways: true,
              label: centerLabel,
              fontSize: '11px',
              fontWeight: 700,
              color: AXIS_COLOR,
              formatter: () => centerText,
            },
          },
        },
      },
    };
    this.dataLabels = { enabled: false };
    this.legend = {
      position: 'bottom',
      fontSize: '12px',
      markers: { size: 6, offsetX: -2 },
      itemMargin: { horizontal: 8, vertical: 4 },
      formatter: (legendName: string, opts) => {
        const val = Number(opts.w.globals.series[opts.seriesIndex]) || 0;
        const pct = total ? Math.round((val / total) * 100) : 0;
        const shown =
          Math.abs(val) >= 1000
            ? val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
            : val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
        return `${legendName} · ${shown} (${pct}%)`;
      },
    };
    this.stroke = { width: 2, colors: ['#fff'] };
    this.tooltip = {
      theme: 'light',
      y: {
        formatter: (val: number) => {
          const pct = total ? Math.round((val / total) * 100) : 0;
          return `${val.toLocaleString('pt-BR')} (${pct}%)`;
        },
      },
    };
  }
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  template: `
    <div class="sig-apex" *ngIf="data.length; else empty">
      <apx-chart
        [series]="series"
        [chart]="chart"
        [stroke]="stroke"
        [fill]="fill"
        [markers]="markers"
        [colors]="colors"
        [dataLabels]="dataLabels"
        [xaxis]="xaxis"
        [yaxis]="yaxis"
        [grid]="grid"
        [tooltip]="tooltip"
        [legend]="legend"
      ></apx-chart>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class LineChartComponent implements OnChanges {
  @Input() data: ChartDatum[] = [];
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() strokeColor = '#023ed8';

  series: ApexAxisChartSeries = [];
  chart: ApexChart = baseChart('area', 260);
  stroke: ApexStroke = {};
  fill: ApexFill = {};
  markers: ApexMarkers = {};
  colors: string[] = [];
  dataLabels: ApexDataLabels = { enabled: false };
  xaxis: ApexXAxis = {};
  yaxis: ApexYAxis = {};
  grid: ApexGrid = baseGrid();
  tooltip: ApexTooltip = baseTooltip();
  legend: ApexLegend = { show: false };

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const prefix = this.prefix;
    const suffix = this.suffix;
    const color = this.strokeColor || PALETTE[0];

    this.colors = [color];
    this.chart = baseChart('area', 260);
    this.series = [
      {
        name: 'Valor',
        data: this.data.map((d) => d.value),
      },
    ];
    this.stroke = {
      curve: 'smooth',
      width: 3,
    };
    this.fill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    };
    this.markers = {
      size: 4,
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: { size: 6 },
    };
    this.dataLabels = { enabled: false };
    this.xaxis = {
      categories: this.data.map((d) => d.label),
      labels: {
        style: { colors: AXIS_COLOR, fontSize: '11px' },
        rotate: 0,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
    this.yaxis = {
      labels: {
        style: { colors: AXIS_COLOR, fontSize: '11px' },
        formatter: (val: number) => formatNum(val, prefix, suffix),
      },
    };
    this.grid = baseGrid();
    this.tooltip = baseTooltip(prefix, suffix);
    this.legend = { show: false };
  }
}

@Component({
  selector: 'app-multi-line-chart',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  template: `
    <div class="sig-apex" *ngIf="series.length && categoryLabels.length; else empty">
      <apx-chart
        [series]="apexSeries"
        [chart]="chart"
        [stroke]="stroke"
        [markers]="markers"
        [colors]="colors"
        [dataLabels]="dataLabels"
        [xaxis]="xaxis"
        [yaxis]="yaxis"
        [grid]="grid"
        [tooltip]="tooltip"
        [legend]="legend"
      ></apx-chart>
    </div>
    <ng-template #empty>
      <div class="sig-chart-empty">Sem dados para exibir</div>
    </ng-template>
  `,
})
export class MultiLineChartComponent implements OnChanges {
  @Input() series: ChartSeries[] = [];
  @Input() prefix = '';
  @Input() suffix = '';

  apexSeries: ApexAxisChartSeries = [];
  chart: ApexChart = baseChart('line', 280);
  stroke: ApexStroke = {};
  markers: ApexMarkers = {};
  colors: string[] = [];
  dataLabels: ApexDataLabels = { enabled: false };
  xaxis: ApexXAxis = {};
  yaxis: ApexYAxis = {};
  grid: ApexGrid = baseGrid();
  tooltip: ApexTooltip = baseTooltip();
  legend: ApexLegend = {};
  categoryLabels: string[] = [];

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const prefix = this.prefix;
    const suffix = this.suffix;
    const labels = Array.from(new Set(this.series.flatMap((s) => s.data.map((d) => d.label))));
    this.categoryLabels = labels;

    this.colors = this.series.map((s, i) => colorAt(i, s.color));
    this.apexSeries = this.series.map((s) => ({
      name: s.label,
      data: labels.map((label) => s.data.find((d) => d.label === label)?.value ?? 0),
    }));
    this.chart = baseChart('line', 280);
    this.stroke = { curve: 'smooth', width: 3 };
    this.markers = {
      size: 4,
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: { size: 6 },
    };
    this.dataLabels = { enabled: false };
    this.xaxis = {
      categories: labels,
      labels: { style: { colors: AXIS_COLOR, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
    this.yaxis = {
      labels: {
        style: { colors: AXIS_COLOR, fontSize: '11px' },
        formatter: (val: number) => formatNum(val, prefix, suffix),
      },
    };
    this.grid = baseGrid();
    this.tooltip = {
      ...baseTooltip(prefix, suffix),
      shared: true,
      intersect: false,
    };
    this.legend = {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      markers: { size: 6, offsetX: -2 },
      itemMargin: { horizontal: 12, vertical: 4 },
    };
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
