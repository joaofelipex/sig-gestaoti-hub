import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Budget, ActionItem } from '../../services/dashboard.service';

interface SliceVM { label: string; value: number; color: string; pct: number; }
interface BarVM { label: string; value: number; pct: number; color: string; }

@Component({
  selector: 'app-economist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6 bg-gray-50 min-h-full">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Visão Economista</h1>
          <p class="text-sm text-gray-500">Análise financeira de TI — orçamentos, economia e ações estratégicas</p>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-12 text-gray-500">Carregando...</div>

      <ng-container *ngIf="!loading">
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="text-xs uppercase tracking-wider text-gray-500">Orçamento Total</div>
            <div class="text-2xl font-bold text-gray-900 mt-1">R$ {{ totalBudget | number:'1.0-0' }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ budgets.length }} linhas orçamentárias</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="text-xs uppercase tracking-wider text-emerald-600">Economia Estimada</div>
            <div class="text-2xl font-bold text-emerald-600 mt-1">R$ {{ totalSavings | number:'1.0-0' }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ savingsRate | number:'1.1-1' }}% do orçamento</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="text-xs uppercase tracking-wider text-blue-600">Ações em Aberto</div>
            <div class="text-2xl font-bold text-blue-600 mt-1">{{ openActions }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ actions.length }} ações no total</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="text-xs uppercase tracking-wider text-violet-600">Ações Concluídas</div>
            <div class="text-2xl font-bold text-violet-600 mt-1">{{ doneActions }}</div>
            <div class="text-xs text-gray-400 mt-1">Taxa {{ doneRate | number:'1.0-0' }}%</div>
          </div>
        </div>

        <!-- Charts row 1 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Budget by Category bar chart -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-gray-900">Orçamento por Categoria</h2>
              <span class="text-xs text-gray-400">R$ por ano</span>
            </div>
            <div *ngIf="budgetByCategory.length === 0" class="text-sm text-gray-400 py-8 text-center">Sem dados</div>
            <div class="space-y-3">
              <div *ngFor="let b of budgetByCategory" class="group">
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-700 font-medium">{{ b.label }}</span>
                  <span class="text-gray-500 tabular-nums">R$ {{ b.value | number:'1.0-0' }}</span>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                       [style.width.%]="b.pct"
                       [style.background]="'linear-gradient(90deg,' + b.color + ',' + lighten(b.color) + ')'"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Donut: Actions by Status -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Ações por Status</h2>
            <div *ngIf="actionsByStatus.length === 0" class="text-sm text-gray-400 py-8 text-center">Sem dados</div>
            <div *ngIf="actionsByStatus.length > 0" class="flex flex-col items-center">
              <svg viewBox="0 0 120 120" class="w-44 h-44 -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" stroke-width="16" />
                <ng-container *ngFor="let s of actionsByStatus; let i = index">
                  <circle cx="60" cy="60" r="50" fill="none"
                          [attr.stroke]="s.color" stroke-width="16"
                          [attr.stroke-dasharray]="(s.pct * 314 / 100) + ' 314'"
                          [attr.stroke-dashoffset]="-statusOffset(i)"
                          stroke-linecap="butt" />
                </ng-container>
                <text x="60" y="58" text-anchor="middle" class="rotate-90"
                      transform="rotate(90 60 60)" font-size="18" font-weight="700" fill="#111827">{{ actions.length }}</text>
                <text x="60" y="74" text-anchor="middle"
                      transform="rotate(90 60 60)" font-size="9" fill="#6b7280">ações</text>
              </svg>
              <div class="mt-4 w-full space-y-2">
                <div *ngFor="let s of actionsByStatus" class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm" [style.background]="s.color"></span>
                    <span class="text-gray-700">{{ s.label }}</span>
                  </div>
                  <span class="text-gray-500 tabular-nums">{{ s.value }} • {{ s.pct | number:'1.0-0' }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts row 2 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Savings by Category -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Economia Estimada por Categoria</h2>
            <div *ngIf="savingsByCategory.length === 0" class="text-sm text-gray-400 py-8 text-center">Sem dados</div>
            <svg *ngIf="savingsByCategory.length > 0" [attr.viewBox]="'0 0 400 ' + (savingsByCategory.length * 38 + 10)"
                 class="w-full" preserveAspectRatio="none" [style.height.px]="savingsByCategory.length * 38 + 10">
              <g *ngFor="let b of savingsByCategory; let i = index">
                <text [attr.x]="0" [attr.y]="i * 38 + 14" font-size="11" fill="#374151" font-weight="500">{{ b.label }}</text>
                <text [attr.x]="400" [attr.y]="i * 38 + 14" font-size="11" fill="#6b7280" text-anchor="end">R$ {{ b.value | number:'1.0-0' }}</text>
                <rect [attr.x]="0" [attr.y]="i * 38 + 20" [attr.width]="400" height="10" rx="5" fill="#f3f4f6" />
                <rect [attr.x]="0" [attr.y]="i * 38 + 20" [attr.width]="b.pct * 4" height="10" rx="5" [attr.fill]="b.color" />
              </g>
            </svg>
          </div>

          <!-- Priority bars -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Ações por Prioridade</h2>
            <div *ngIf="actionsByPriority.length === 0" class="text-sm text-gray-400 py-8 text-center">Sem dados</div>
            <div *ngIf="actionsByPriority.length > 0" class="flex items-end justify-around h-56 px-2 gap-4">
              <div *ngFor="let p of actionsByPriority" class="flex-1 flex flex-col items-center gap-2">
                <div class="text-xs font-semibold text-gray-700">{{ p.value }}</div>
                <div class="w-full rounded-t-lg transition-all duration-500"
                     [style.height.%]="p.pct"
                     [style.background]="'linear-gradient(180deg,' + lighten(p.color) + ',' + p.color + ')'"
                     style="min-height: 4px;"></div>
                <div class="text-xs text-gray-600 font-medium">{{ p.label }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Actions -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-900">Top 5 Ações por Economia Estimada</h2>
            <span class="text-xs text-gray-400">{{ actions.length }} ações</span>
          </div>
          <div *ngIf="topActions.length === 0" class="text-sm text-gray-400 py-6 text-center">Sem dados</div>
          <div class="overflow-x-auto" *ngIf="topActions.length > 0">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase text-gray-500 border-b border-gray-100">
                  <th class="py-2 pr-4">Ação</th>
                  <th class="py-2 pr-4">Categoria</th>
                  <th class="py-2 pr-4">Prioridade</th>
                  <th class="py-2 pr-4">Status</th>
                  <th class="py-2 pr-4 text-right">Economia</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let a of topActions" class="border-b border-gray-50 hover:bg-gray-50">
                  <td class="py-3 pr-4 font-medium text-gray-900">{{ a.title }}</td>
                  <td class="py-3 pr-4 text-gray-600">{{ a.category }}</td>
                  <td class="py-3 pr-4">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="getPriorityClass(a.priority)">{{ a.priority }}</span>
                  </td>
                  <td class="py-3 pr-4">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="getStatusClass(a.status)">{{ a.status }}</span>
                  </td>
                  <td class="py-3 pr-4 text-right tabular-nums font-semibold text-emerald-600">R$ {{ a.estimatedSavings | number:'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class EconomistComponent implements OnInit, OnDestroy {
  budgets: Budget[] = [];
  actions: ActionItem[] = [];
  loading = true;
  private subscription!: Subscription;

  totalBudget = 0;
  totalSavings = 0;
  savingsRate = 0;
  openActions = 0;
  doneActions = 0;
  doneRate = 0;

  budgetByCategory: BarVM[] = [];
  savingsByCategory: BarVM[] = [];
  actionsByStatus: SliceVM[] = [];
  actionsByPriority: BarVM[] = [];
  topActions: ActionItem[] = [];

  private palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.budgets = data.budgets;
      this.actions = data.actions;
      this.loading = data.loading;
      if (!data.loading) this.compute();
    });
  }

  ngOnDestroy() { this.subscription?.unsubscribe(); }

  private compute() {
    this.totalBudget = this.budgets.reduce((s, b) => s + (b.annualBudget || 0), 0);
    this.totalSavings = this.actions.reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    this.savingsRate = this.totalBudget > 0 ? (this.totalSavings / this.totalBudget) * 100 : 0;
    this.openActions = this.actions.filter(a => a.status !== 'Concluída' && a.status !== 'Cancelada').length;
    this.doneActions = this.actions.filter(a => a.status === 'Concluída').length;
    this.doneRate = this.actions.length ? (this.doneActions / this.actions.length) * 100 : 0;

    this.budgetByCategory = this.groupSum(this.budgets, b => b.category, b => b.annualBudget);
    this.savingsByCategory = this.groupSum(this.actions, a => a.category || 'Outros', a => a.estimatedSavings);

    const statusColors: Record<string, string> = {
      'Concluída': '#10b981', 'Em andamento': '#3b82f6', 'Pendente': '#f59e0b', 'Cancelada': '#ef4444'
    };
    const statusCounts = this.countBy(this.actions, a => a.status || 'Pendente');
    const totalA = this.actions.length || 1;
    this.actionsByStatus = Object.entries(statusCounts).map(([label, value]) => ({
      label, value, color: statusColors[label] || '#6b7280', pct: (value / totalA) * 100
    }));

    const priColors: Record<string, string> = { 'Alta': '#ef4444', 'Média': '#f59e0b', 'Baixa': '#10b981' };
    const priCounts = this.countBy(this.actions, a => a.priority || 'Média');
    const maxP = Math.max(1, ...Object.values(priCounts));
    this.actionsByPriority = ['Alta', 'Média', 'Baixa']
      .filter(k => priCounts[k])
      .map(k => ({ label: k, value: priCounts[k], pct: (priCounts[k] / maxP) * 100, color: priColors[k] }));

    this.topActions = [...this.actions].sort((a, b) => b.estimatedSavings - a.estimatedSavings).slice(0, 5);
  }

  private groupSum<T>(items: T[], keyFn: (x: T) => string, valFn: (x: T) => number): BarVM[] {
    const map = new Map<string, number>();
    for (const it of items) {
      const k = keyFn(it) || 'Outros';
      map.set(k, (map.get(k) || 0) + (valFn(it) || 0));
    }
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...arr.map(x => x[1]));
    return arr.map(([label, value], i) => ({
      label, value, pct: (value / max) * 100, color: this.palette[i % this.palette.length]
    }));
  }

  private countBy<T>(items: T[], keyFn: (x: T) => string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const it of items) { const k = keyFn(it); out[k] = (out[k] || 0) + 1; }
    return out;
  }

  statusOffset(idx: number): number {
    let acc = 0;
    for (let i = 0; i < idx; i++) acc += (this.actionsByStatus[i].pct * 314) / 100;
    return acc;
  }

  lighten(hex: string): string {
    // Return a lighter shade by mixing with white
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * 0.35);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Alta': return 'bg-red-100 text-red-700';
      case 'Média': return 'bg-yellow-100 text-yellow-700';
      case 'Baixa': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Concluída': return 'bg-emerald-100 text-emerald-700';
      case 'Em andamento': return 'bg-blue-100 text-blue-700';
      case 'Pendente': return 'bg-yellow-100 text-yellow-700';
      case 'Cancelada': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
