import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  DashboardService,
  Budget,
  ActionItem,
} from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import {
  KpiCardComponent,
  BarChartComponent,
  DonutChartComponent,
  ChartDatum,
} from '../../components/charts.component';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { SigIcons } from '../../core/sig-icons';
import { SigBadge } from '../../utils/status-badge';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

type TabId = 'visao' | 'orcamentos' | 'acoes';

@Component({
  selector: 'app-economist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiCardComponent,
    BarChartComponent,
    DonutChartComponent,
    DataToolbarComponent,
    ModalComponent,
    ConfirmComponent,
  ],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Visão Economista</h1>
          <p class="app-page-sub">Análise financeira de TI — orçamentos, economia e ações estratégicas.</p>
        </div>
      </header>

      <nav class="sig-tabs-nav" aria-label="Módulo economista">
        <button type="button" (click)="tab = 'visao'" [class.is-active]="tab === 'visao'">Painel financeiro</button>
        <button type="button" (click)="tab = 'orcamentos'" [class.is-active]="tab === 'orcamentos'">
          Orçamentos ({{ budgets.length }})
        </button>
        <button type="button" (click)="tab = 'acoes'" [class.is-active]="tab === 'acoes'">
          Ações estratégicas ({{ actions.length }})
        </button>
      </nav>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>

      <!-- ========== PAINEL ========== -->
      <ng-container *ngIf="!loading && tab === 'visao'">
        <div
          *ngIf="!hasData"
          class="sig-notice-panel"
          role="status"
        >
          <p class="sig-notice-panel__title">
            <i class="fas fa-chart-pie me-2" aria-hidden="true"></i>
            Sem dados financeiros ainda
          </p>
          <p class="mb-2">Cadastre orçamentos anuais e ações de economia para ver indicadores, gráficos e priorização.</p>
          <ul>
            <li>Use a aba <strong>Orçamentos</strong> para linhas por categoria e centro de custo.</li>
            <li>Use <strong>Ações estratégicas</strong> para iniciativas FinOps com economia estimada.</li>
          </ul>
        </div>

        <ng-container *ngIf="hasData">
          <div class="sig-kpi-grid">
            <app-kpi-card
              label="Orçamento total"
              [value]="brl(totalBudget)"
              [icon]="icons.budget"
              color="#475569"
              [hint]="budgets.length + ' linha(s) orçamentária(s)'"
            ></app-kpi-card>
            <app-kpi-card
              label="Economia estimada"
              [value]="brl(totalSavings)"
              [icon]="icons.savings"
              color="#10b981"
              [hint]="savingsRateLabel"
            ></app-kpi-card>
            <app-kpi-card
              label="Potencial vs orçamento"
              [value]="savingsRatePct"
              [icon]="icons.chart"
              [color]="brandHex"
              hint="% das ações sobre o orçamento"
            ></app-kpi-card>
            <app-kpi-card
              label="Ações em aberto"
              [value]="openActions"
              [icon]="icons.tasks"
              color="#3b82f6"
              [hint]="overdueCount + ' vencida(s)'"
            ></app-kpi-card>
          </div>

          <div class="sig-metric-row">
            <div class="sig-metric-tile">
              <p class="sig-metric-tile__label">Concluídas</p>
              <p class="sig-metric-tile__value">{{ doneActions }}</p>
              <p class="sig-metric-tile__hint">{{ doneRateLabel }}</p>
            </div>
            <div class="sig-metric-tile">
              <p class="sig-metric-tile__label">Economia realizada</p>
              <p class="sig-metric-tile__value">{{ brl(doneSavings) }}</p>
              <p class="sig-metric-tile__hint">Ações concluídas</p>
            </div>
            <div class="sig-metric-tile">
              <p class="sig-metric-tile__label">Pipeline (abertas)</p>
              <p class="sig-metric-tile__value">{{ brl(openSavings) }}</p>
              <p class="sig-metric-tile__hint">Economia ainda não capturada</p>
            </div>
            <div class="sig-metric-tile">
              <p class="sig-metric-tile__label">Ano corrente</p>
              <p class="sig-metric-tile__value">{{ brl(currentYearBudget) }}</p>
              <p class="sig-metric-tile__hint">Orçado em {{ currentYear }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div class="sig-chart-panel lg:col-span-2">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Orçamento por categoria</h3>
                <span class="sig-chart-panel__meta">Valores anuais (R$)</span>
              </div>
              <app-bar-chart [data]="budgetChartData" prefix="R$ "></app-bar-chart>
            </div>
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Ações por status</h3>
              </div>
              <app-donut-chart [data]="statusChartData"></app-donut-chart>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Economia estimada por categoria</h3>
                <span class="sig-chart-panel__meta">Todas as ações</span>
              </div>
              <app-bar-chart [data]="savingsChartData" prefix="R$ "></app-bar-chart>
            </div>
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Ações por prioridade</h3>
              </div>
              <app-bar-chart [data]="priorityChartData"></app-bar-chart>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="sig-chart-panel" *ngIf="upcomingActions.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Próximos prazos (60 dias)</h3>
              </div>
              <div class="d-flex flex-column gap-2">
                <article
                  *ngFor="let a of upcomingActions"
                  class="sig-action-card"
                  [class.is-overdue]="a._overdue"
                  [class.is-soon]="a._soon && !a._overdue"
                >
                  <p class="sig-action-card__title">{{ a.title }}</p>
                  <p class="sig-action-card__meta">
                    {{ a.dueDate | date:'dd/MM/yyyy' }} · {{ a.priority }} · {{ brl(a.estimatedSavings) }}
                    <span *ngIf="a._overdue"> · <strong class="text-danger">Vencida</strong></span>
                  </p>
                </article>
              </div>
            </div>
            <div class="sig-chart-panel" [class.lg:col-span-2]="!upcomingActions.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Resumo executivo</h3>
              </div>
              <ul class="mb-0 ps-3 text-sm" style="color: var(--sig-text-muted)">
                <li class="mb-2">
                  O orçamento de TI soma <strong>{{ brl(totalBudget) }}</strong> em
                  <strong>{{ budgetCategories }}</strong> categoria(s).
                </li>
                <li class="mb-2">
                  O pipeline de economia totaliza <strong>{{ brl(totalSavings) }}</strong>
                  ({{ savingsRateLabel }}).
                </li>
                <li class="mb-2" *ngIf="topCategory">
                  Maior fatia orçamentária: <strong>{{ topCategory.label }}</strong>
                  ({{ brl(topCategory.value) }}).
                </li>
                <li *ngIf="topSavingAction">
                  Maior oportunidade: <strong>{{ topSavingAction.title }}</strong>
                  ({{ brl(topSavingAction.estimatedSavings) }}).
                </li>
              </ul>
            </div>
          </div>

          <div class="sig-list-card">
            <div class="sig-chart-panel__head px-3 pt-3">
              <h3 class="sig-chart-title mb-0">Top ações por economia estimada</h3>
              <span class="sig-chart-panel__meta">{{ actions.length }} ações</span>
            </div>
            <div class="sig-table-wrap">
              <table class="sig-table">
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Categoria</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th class="text-end">Economia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of topActions">
                    <td class="fw-medium">{{ a.title }}</td>
                    <td>{{ a.category }}</td>
                    <td><span [class]="priorityBadge(a.priority)">{{ a.priority }}</span></td>
                    <td><span [class]="statusBadge(a.status)">{{ a.status }}</span></td>
                    <td>{{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : '—' }}</td>
                    <td class="text-end fw-medium">{{ brl(a.estimatedSavings) }}</td>
                  </tr>
                  <tr *ngIf="!topActions.length">
                    <td colspan="6" class="sig-table-empty">Nenhuma ação cadastrada</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>
      </ng-container>

      <!-- ========== ORÇAMENTOS ========== -->
      <ng-container *ngIf="!loading && tab === 'orcamentos'">
        <app-data-toolbar
          searchPlaceholder="Buscar categoria, centro de custo..."
          [search]="searchBudget"
          [filters]="budgetFilters"
          [filterValues]="filterBudget"
          (searchChange)="searchBudget = $event"
          (filterChange)="filterBudget[$event.key] = $event.value"
          (newClick)="openNewBudget()"
          (exportClick)="exportBudgets()"
          (importFile)="importBudgets($event)"
        ></app-data-toolbar>

        <div class="sig-list-card">
          <div class="sig-table-wrap">
            <table class="sig-table">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Categoria</th>
                  <th>Centro de custo</th>
                  <th class="text-end">Orçamento anual</th>
                  <th>Notas</th>
                  <th class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of filteredBudgets">
                  <td>{{ b.year }}</td>
                  <td class="fw-medium">{{ b.category }}</td>
                  <td>{{ b.costCenter }}</td>
                  <td class="text-end fw-medium">{{ brl(b.annualBudget) }}</td>
                  <td class="text-muted small">{{ b.notes || '—' }}</td>
                  <td class="text-end">
                    <button type="button" (click)="openEditBudget(b)" class="sig-link-action me-3">Editar</button>
                    <button type="button" (click)="askDeleteBudget(b)" class="sig-link-action sig-link-action--danger">
                      Excluir
                    </button>
                  </td>
                </tr>
                <tr *ngIf="!filteredBudgets.length">
                  <td colspan="6" class="sig-table-empty">Nenhum orçamento</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- ========== AÇÕES ========== -->
      <ng-container *ngIf="!loading && tab === 'acoes'">
        <app-data-toolbar
          searchPlaceholder="Buscar título, responsável, categoria..."
          [search]="searchAction"
          [filters]="actionFilters"
          [filterValues]="filterAction"
          (searchChange)="searchAction = $event"
          (filterChange)="filterAction[$event.key] = $event.value"
          (newClick)="openNewAction()"
          (exportClick)="exportActions()"
          (importFile)="importActions($event)"
        ></app-data-toolbar>

        <div class="sig-list-card">
          <div class="sig-table-wrap">
            <table class="sig-table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Categoria</th>
                  <th>Prioridade</th>
                  <th>Esforço</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th class="text-end">Economia</th>
                  <th class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let a of filteredActions">
                  <td class="fw-medium">{{ a.title }}</td>
                  <td>{{ a.category }}</td>
                  <td><span [class]="priorityBadge(a.priority)">{{ a.priority }}</span></td>
                  <td>{{ a.effort }}</td>
                  <td><span [class]="statusBadge(a.status)">{{ a.status }}</span></td>
                  <td>{{ a.owner || '—' }}</td>
                  <td>{{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : '—' }}</td>
                  <td class="text-end fw-medium">{{ brl(a.estimatedSavings) }}</td>
                  <td class="text-end">
                    <button
                      *ngIf="!isDone(a.status)"
                      type="button"
                      (click)="markActionDone(a)"
                      class="sig-link-action sig-link-action--success me-2"
                    >
                      Concluir
                    </button>
                    <button type="button" (click)="openEditAction(a)" class="sig-link-action me-2">Editar</button>
                    <button type="button" (click)="askDeleteAction(a)" class="sig-link-action sig-link-action--danger">
                      Excluir
                    </button>
                  </td>
                </tr>
                <tr *ngIf="!filteredActions.length">
                  <td colspan="9" class="sig-table-empty">Nenhuma ação</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </section>

    <!-- Modal orçamento -->
    <app-modal
      [open]="budgetModal"
      [title]="budgetForm.id ? 'Editar orçamento' : 'Novo orçamento'"
      [saving]="saving"
      (close)="budgetModal = false"
      (save)="saveBudget()"
    >
      <div class="sig-modal-form grid grid-cols-2 gap-4">
        <label class="text-sm col-span-2">
          Categoria *
          <input [(ngModel)]="budgetForm.category" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Ano *
          <input type="number" [(ngModel)]="budgetForm.year" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Centro de custo *
          <input [(ngModel)]="budgetForm.cost_center" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm col-span-2">
          Orçamento anual (R$) *
          <input
            type="number"
            step="0.01"
            [(ngModel)]="budgetForm.annual_budget"
            class="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
        <label class="text-sm col-span-2">
          Notas
          <textarea [(ngModel)]="budgetForm.notes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea>
        </label>
      </div>
    </app-modal>

    <!-- Modal ação -->
    <app-modal
      [open]="actionModal"
      [title]="actionForm.id ? 'Editar ação' : 'Nova ação estratégica'"
      [saving]="saving"
      (close)="actionModal = false"
      (save)="saveAction()"
    >
      <div class="sig-modal-form grid grid-cols-2 gap-4">
        <label class="text-sm col-span-2">
          Título *
          <input [(ngModel)]="actionForm.title" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm col-span-2">
          Descrição
          <textarea [(ngModel)]="actionForm.description" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea>
        </label>
        <label class="text-sm">
          Categoria *
          <select [(ngModel)]="actionForm.category" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option *ngFor="let c of categoryOptions" [value]="c">{{ c }}</option>
          </select>
        </label>
        <label class="text-sm">
          Prioridade
          <select [(ngModel)]="actionForm.priority" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>Alta</option>
            <option>Média</option>
            <option>Baixa</option>
          </select>
        </label>
        <label class="text-sm">
          Esforço
          <select [(ngModel)]="actionForm.effort" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>S</option>
            <option>M</option>
            <option>L</option>
          </select>
        </label>
        <label class="text-sm">
          Status
          <select [(ngModel)]="actionForm.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
          </select>
        </label>
        <label class="text-sm">
          Responsável
          <input [(ngModel)]="actionForm.owner" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Prazo
          <input type="date" [(ngModel)]="actionForm.due_date" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Economia estimada (R$)
          <input
            type="number"
            step="0.01"
            [(ngModel)]="actionForm.estimated_savings"
            class="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
      </div>
    </app-modal>

    <app-confirm
      [open]="confirmBudget"
      title="Excluir orçamento"
      [message]="'Excluir ' + (toDeleteBudget?.category || 'esta linha') + '?'"
      (cancel)="confirmBudget = false"
      (confirm)="doDeleteBudget()"
    ></app-confirm>

    <app-confirm
      [open]="confirmAction"
      title="Excluir ação"
      [message]="'Excluir «' + (toDeleteAction?.title || '') + '»?'"
      (cancel)="confirmAction = false"
      (confirm)="doDeleteAction()"
    ></app-confirm>
  `,
})
export class EconomistComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  readonly brandHex = '#023ed8';

  tab: TabId = 'visao';
  budgets: Budget[] = [];
  actions: ActionItem[] = [];
  loading = true;
  private sub!: Subscription;

  totalBudget = 0;
  totalSavings = 0;
  savingsRate = 0;
  openActions = 0;
  doneActions = 0;
  doneSavings = 0;
  openSavings = 0;
  overdueCount = 0;
  currentYear = new Date().getFullYear();
  currentYearBudget = 0;
  budgetCategories = 0;

  budgetChartData: ChartDatum[] = [];
  savingsChartData: ChartDatum[] = [];
  statusChartData: ChartDatum[] = [];
  priorityChartData: ChartDatum[] = [];
  topActions: ActionItem[] = [];
  upcomingActions: (ActionItem & { _overdue?: boolean; _soon?: boolean })[] = [];
  topCategory: ChartDatum | null = null;
  topSavingAction: ActionItem | null = null;

  searchBudget = '';
  filterBudget: Record<string, string> = {};
  searchAction = '';
  filterAction: Record<string, string> = {};

  budgetModal = false;
  actionModal = false;
  confirmBudget = false;
  confirmAction = false;
  saving = false;
  budgetForm: any = {};
  actionForm: any = {};
  toDeleteBudget: Budget | null = null;
  toDeleteAction: ActionItem | null = null;

  readonly statusOptions = ['Aberto', 'Em andamento', 'Concluída', 'Cancelada', 'Pendente'];
  readonly categoryOptions = [
    'FinOps',
    'Infraestrutura',
    'Licenciamento',
    'Cloud',
    'Segurança',
    'Contratos',
    'Outros',
  ];

  private readonly chartColors = [
    '#023ed8',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#64748b',
  ];

  private readonly statusColors: Record<string, string> = {
    Concluída: '#10b981',
    'Em andamento': '#023ed8',
    Aberto: '#f59e0b',
    Pendente: '#f59e0b',
    Cancelada: '#ef4444',
  };

  constructor(
    private dashboard: DashboardService,
    private crud: CrudService,
  ) {}

  ngOnInit() {
    this.sub = this.dashboard.data$.subscribe((d) => {
      this.budgets = d.budgets;
      this.actions = d.actions;
      this.loading = d.loading;
      if (!d.loading) this.compute();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get hasData() {
    return this.budgets.length > 0 || this.actions.length > 0;
  }

  get savingsRateLabel() {
    return `${this.savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do orçamento`;
  }

  get savingsRatePct() {
    return `${this.savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  get doneRateLabel() {
    const rate = this.actions.length ? (this.doneActions / this.actions.length) * 100 : 0;
    return `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% do total`;
  }

  get budgetFilters() {
    const years = [...new Set(this.budgets.map((b) => String(b.year)))].sort().reverse();
    return [
      {
        key: 'year',
        label: 'Ano',
        options: years.map((y) => ({ value: y, label: y })),
      },
    ];
  }

  get actionFilters() {
    return [
      {
        key: 'status',
        label: 'Status',
        options: this.statusOptions.map((s) => ({ value: s, label: s })),
      },
      {
        key: 'priority',
        label: 'Prioridade',
        options: ['Alta', 'Média', 'Baixa'].map((p) => ({ value: p, label: p })),
      },
    ];
  }

  get filteredBudgets() {
    const q = this.searchBudget.toLowerCase();
    return this.budgets.filter(
      (b) =>
        (!q ||
          b.category?.toLowerCase().includes(q) ||
          b.costCenter?.toLowerCase().includes(q) ||
          String(b.year).includes(q)) &&
        (!this.filterBudget['year'] || String(b.year) === this.filterBudget['year']),
    );
  }

  get filteredActions() {
    const q = this.searchAction.toLowerCase();
    return this.actions.filter(
      (a) =>
        (!q ||
          a.title?.toLowerCase().includes(q) ||
          a.owner?.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q)) &&
        (!this.filterAction['status'] || a.status === this.filterAction['status']) &&
        (!this.filterAction['priority'] || a.priority === this.filterAction['priority']),
    );
  }

  brl(v: number) {
    return 'R$ ' + (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  priorityBadge(p: string) {
    const k = (p || '').toLowerCase();
    if (k.startsWith('alta')) return SigBadge.danger;
    if (k.startsWith('méd') || k.startsWith('med')) return SigBadge.warning;
    if (k.startsWith('baixa')) return SigBadge.success;
    return SigBadge.neutral;
  }

  statusBadge(s: string) {
    if (this.isDone(s)) return SigBadge.success;
    const k = (s || '').toLowerCase();
    if (k.includes('cancel')) return SigBadge.danger;
    if (k.includes('andamento')) return SigBadge.brand;
    if (k.includes('aberto') || k.includes('pendente')) return SigBadge.warning;
    return SigBadge.neutral;
  }

  isDone(status: string) {
    const k = (status || '').toLowerCase();
    return k.startsWith('conclu');
  }

  isOpen(status: string) {
    return !this.isDone(status) && !(status || '').toLowerCase().includes('cancel');
  }

  private compute() {
    this.totalBudget = this.budgets.reduce((s, b) => s + (b.annualBudget || 0), 0);
    this.totalSavings = this.actions.reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    this.savingsRate = this.totalBudget > 0 ? (this.totalSavings / this.totalBudget) * 100 : 0;

    this.openActions = this.actions.filter((a) => this.isOpen(a.status)).length;
    this.doneActions = this.actions.filter((a) => this.isDone(a.status)).length;
    this.doneSavings = this.actions
      .filter((a) => this.isDone(a.status))
      .reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    this.openSavings = this.actions
      .filter((a) => this.isOpen(a.status))
      .reduce((s, a) => s + (a.estimatedSavings || 0), 0);

    this.currentYearBudget = this.budgets
      .filter((b) => b.year === this.currentYear)
      .reduce((s, b) => s + b.annualBudget, 0);

    const cats = new Set(this.budgets.map((b) => b.category));
    this.budgetCategories = cats.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in60 = new Date(today);
    in60.setDate(in60.getDate() + 60);

    this.overdueCount = 0;
    this.upcomingActions = this.actions
      .filter((a) => this.isOpen(a.status) && a.dueDate)
      .map((a) => {
        const d = new Date(a.dueDate!);
        d.setHours(0, 0, 0, 0);
        const overdue = d < today;
        const soon = !overdue && d <= in60;
        if (overdue) this.overdueCount++;
        return { ...a, _overdue: overdue, _soon: soon };
      })
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5);

    this.budgetChartData = this.groupChart(this.budgets, (b) => b.category, (b) => b.annualBudget);
    this.savingsChartData = this.groupChart(
      this.actions,
      (a) => a.category || 'Outros',
      (a) => a.estimatedSavings,
    );
    this.topCategory = this.budgetChartData[0] ?? null;

    const statusMap = this.countMap(this.actions, (a) => a.status || 'Aberto');
    this.statusChartData = Object.entries(statusMap).map(([label, value], i) => ({
      label,
      value,
      color: this.statusColors[label] || this.chartColors[i % this.chartColors.length],
    }));

    const priMap = this.countMap(this.actions, (a) => a.priority || 'Média');
    const priOrder = ['Alta', 'Média', 'Baixa'];
    this.priorityChartData = priOrder
      .filter((k) => priMap[k])
      .map((label, i) => ({
        label,
        value: priMap[label],
        color: ['#ef4444', '#f59e0b', '#10b981'][i] || this.chartColors[i],
      }));

    this.topActions = [...this.actions]
      .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
      .slice(0, 8);
    this.topSavingAction = this.topActions[0] ?? null;
  }

  private groupChart<T>(
    items: T[],
    keyFn: (x: T) => string,
    valFn: (x: T) => number,
  ): ChartDatum[] {
    const map = new Map<string, number>();
    for (const it of items) {
      const k = keyFn(it) || 'Outros';
      map.set(k, (map.get(k) || 0) + (valFn(it) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: this.chartColors[i % this.chartColors.length],
      }));
  }

  private countMap<T>(items: T[], keyFn: (x: T) => string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const it of items) {
      const k = keyFn(it);
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  openNewBudget() {
    this.budgetForm = {
      year: this.currentYear,
      category: 'Infraestrutura',
      cost_center: 'CC-TI',
      annual_budget: 0,
      notes: '',
    };
    this.budgetModal = true;
  }

  openEditBudget(b: Budget) {
    this.budgetForm = {
      id: b.id,
      year: b.year,
      category: b.category,
      cost_center: b.costCenter,
      annual_budget: b.annualBudget,
      notes: b.notes || '',
    };
    this.budgetModal = true;
  }

  async saveBudget() {
    if (!this.budgetForm.category || !this.budgetForm.cost_center) return;
    this.saving = true;
    const ok = await this.crud.upsert('orcamentos', { ...this.budgetForm });
    this.saving = false;
    if (ok) this.budgetModal = false;
  }

  askDeleteBudget(b: Budget) {
    this.toDeleteBudget = b;
    this.confirmBudget = true;
  }

  async doDeleteBudget() {
    if (this.toDeleteBudget) await this.crud.remove('orcamentos', this.toDeleteBudget.id);
    this.confirmBudget = false;
    this.toDeleteBudget = null;
  }

  exportBudgets() {
    exportToCSV(
      this.filteredBudgets.map((b) => ({
        Ano: b.year,
        Categoria: b.category,
        CentroCusto: b.costCenter,
        OrcamentoAnual: b.annualBudget,
        Notas: b.notes,
      })),
      'orcamentos',
    );
  }

  async importBudgets(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows
      .map((r) => ({
        year: Number(r['Ano'] || r['year'] || this.currentYear),
        category: r['Categoria'] || r['category'],
        cost_center: r['CentroCusto'] || r['cost_center'] || 'CC-TI',
        annual_budget: Number(r['OrcamentoAnual'] || r['annual_budget'] || 0),
        notes: r['Notas'] || r['notes'] || null,
      }))
      .filter((r) => r.category);
    if (payload.length) await this.crud.bulkInsert('orcamentos', payload);
  }

  openNewAction() {
    this.actionForm = {
      title: '',
      description: '',
      category: 'FinOps',
      priority: 'Média',
      effort: 'M',
      status: 'Aberto',
      owner: '',
      due_date: '',
      estimated_savings: 0,
    };
    this.actionModal = true;
  }

  openEditAction(a: ActionItem) {
    this.actionForm = {
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      priority: a.priority,
      effort: a.effort,
      status: a.status,
      owner: a.owner,
      due_date: a.dueDate || '',
      estimated_savings: a.estimatedSavings,
    };
    this.actionModal = true;
  }

  async saveAction() {
    if (!this.actionForm.title) return;
    this.saving = true;
    const o = { ...this.actionForm };
    if (!o.due_date) o.due_date = null;
    const ok = await this.crud.upsert('acoes_economista', o);
    this.saving = false;
    if (ok) this.actionModal = false;
  }

  async markActionDone(a: ActionItem) {
    await this.crud.upsert('acoes_economista', { id: a.id, status: 'Concluída' });
  }

  askDeleteAction(a: ActionItem) {
    this.toDeleteAction = a;
    this.confirmAction = true;
  }

  async doDeleteAction() {
    if (this.toDeleteAction) await this.crud.remove('acoes_economista', this.toDeleteAction.id);
    this.confirmAction = false;
    this.toDeleteAction = null;
  }

  exportActions() {
    exportToCSV(
      this.filteredActions.map((a) => ({
        Titulo: a.title,
        Categoria: a.category,
        Prioridade: a.priority,
        Esforco: a.effort,
        Status: a.status,
        Responsavel: a.owner,
        Prazo: a.dueDate,
        Economia: a.estimatedSavings,
      })),
      'acoes_economista',
    );
  }

  async importActions(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows
      .map((r) => ({
        title: r['Titulo'] || r['title'],
        description: r['Descricao'] || r['description'] || '',
        category: r['Categoria'] || r['category'] || 'FinOps',
        priority: r['Prioridade'] || r['priority'] || 'Média',
        effort: r['Esforco'] || r['effort'] || 'M',
        status: r['Status'] || r['status'] || 'Aberto',
        owner: r['Responsavel'] || r['owner'] || '',
        due_date: r['Prazo'] || r['due_date'] || null,
        estimated_savings: Number(r['Economia'] || r['estimated_savings'] || 0),
      }))
      .filter((r) => r.title);
    if (payload.length) await this.crud.bulkInsert('acoes_economista', payload);
  }
}
