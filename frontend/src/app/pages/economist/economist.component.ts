import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  DashboardService,
  Budget,
  ActionItem,
  FinancialContract,
  License,
  Server,
  Domain,
  Payment,
} from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import {
  KpiCardComponent,
  BarChartComponent,
  DonutChartComponent,
  LineChartComponent,
  MultiLineChartComponent,
  ChartDatum,
  ChartSeries,
} from '../../components/charts.component';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { TiMetricsService, TiMetrics } from '../../services/ti-metrics.service';
import { SigIcons } from '../../core/sig-icons';
import { SigBadge } from '../../utils/status-badge';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import {
  classifySpendType,
  consolidatedAnnualBase,
  formatBrl,
  operationalCostBreakdown,
  paymentsYearTotal,
} from '../../utils/financial.util';
import {
  computeFinancialHealth,
  healthScoreColor,
} from '../../utils/health.util';

type TabId = 'visao' | 'orcamentos' | 'acoes' | 'contratos';

@Component({
  selector: 'app-economist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiCardComponent,
    BarChartComponent,
    DonutChartComponent,
    LineChartComponent,
    MultiLineChartComponent,
    DataToolbarComponent,
    ModalComponent,
    ConfirmComponent,
  ],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Visão Economista</h1>
          <p class="app-page-sub">
            Análise financeira integrada — orçamentos, custos operacionais (Painel) e ações de economia.
          </p>
        </div>
        <div class="sig-page-header-actions">
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="goToBudgets()">
            <i class="fas fa-plus me-1" aria-hidden="true"></i> Orçamento
          </button>
          <button type="button" class="btn btn-primary btn-sm" (click)="goToActions()">
            <i class="fas fa-bolt me-1" aria-hidden="true"></i> Nova ação
          </button>
        </div>
      </header>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>

      <ng-container *ngIf="!loading && hasData">
        <div class="sig-kpi-grid sig-kpi-grid--5">
          <app-kpi-card
            label="Custo mensal TI"
            [value]="brl(displayOperationalMonthly)"
            [icon]="icons.cost"
            color="#10b981"
            [hint]="displayOperationalHint"
          ></app-kpi-card>
          <app-kpi-card
            label="Orçamento planejado"
            [value]="brl(displayBudget)"
            [icon]="icons.budget"
            color="#475569"
            [hint]="displayBudgetHint"
          ></app-kpi-card>
          <app-kpi-card
            label="Economia estimada"
            [value]="brl(displaySavings)"
            [icon]="icons.savings"
            color="#10b981"
            [hint]="savingsRateLabel"
          ></app-kpi-card>
          <app-kpi-card
            label="ROI sobre base"
            [value]="roiPct"
            [icon]="icons.chart"
            color="#8b5cf6"
            [hint]="roiHint"
          ></app-kpi-card>
          <app-kpi-card
            label="Saúde financeira"
            [value]="displayFinancialHealth + '%'"
            [icon]="icons.health"
            [color]="displayFinancialHealthColor"
            [hint]="displayFinancialHealthHint"
          ></app-kpi-card>
        </div>
      </ng-container>

      <nav class="sig-tabs-nav" aria-label="Módulo economista">
        <button type="button" (click)="tab = 'visao'" [class.is-active]="tab === 'visao'">Painel financeiro</button>
        <button type="button" (click)="tab = 'orcamentos'" [class.is-active]="tab === 'orcamentos'">
          Orçamentos ({{ budgets.length }})
        </button>
        <button type="button" (click)="tab = 'acoes'" [class.is-active]="tab === 'acoes'">
          Ações estratégicas ({{ actions.length }})
        </button>
        <button type="button" (click)="tab = 'contratos'" [class.is-active]="tab === 'contratos'">
          Contratos ({{ contracts.length }})
        </button>
      </nav>

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
          <p class="mb-2">
            Cadastre orçamentos e ações de economia, ou use os módulos de
            <strong>Servidores</strong>, <strong>Licenças</strong> e <strong>Domínios</strong>
            (mesma base de custo do Painel principal).
          </p>
          <ul>
            <li>Orçamentos anuais por categoria e centro de custo.</li>
            <li>Ações estratégicas com economia estimada e prazo.</li>
            <li>Custos operacionais calculados a partir do cadastro SAM.</li>
          </ul>
          <div class="sig-econ-empty-actions">
            <button type="button" class="btn btn-outline-primary btn-sm" (click)="goToBudgets()">
              <i class="fas fa-wallet me-1" aria-hidden="true"></i> Criar orçamento
            </button>
            <button type="button" class="btn btn-primary btn-sm" (click)="goToActions()">
              <i class="fas fa-bolt me-1" aria-hidden="true"></i> Criar ação estratégica
            </button>
          </div>
        </div>

        <ng-container *ngIf="hasData">
          <div class="sig-econ-toolbar" *ngIf="yearOptions.length > 1">
            <p class="sig-econ-toolbar__label mb-0">Período</p>
            <select
              class="sig-econ-toolbar__select"
              [(ngModel)]="panelYear"
              (ngModelChange)="onPanelYearChange()"
            >
              <option [ngValue]="'all'">Todos os anos</option>
              <option *ngFor="let y of yearOptions" [ngValue]="y">{{ y }}</option>
            </select>
            <span class="sig-chart-panel__meta ms-auto">{{ panelYearLabel }}</span>
          </div>

          <div class="sig-econ-hero">
            <div>
              <p class="sig-econ-hero__label">Base consolidada anual</p>
              <p class="sig-econ-hero__value">{{ brl(financialBase) }}</p>
              <p class="sig-econ-hero__sub">
                Orçamento {{ brl(totalBudget) }} · Operacional {{ brl(operationalAnnual) }} · Contratos {{ brl(annualContractCost) }}
              </p>
            </div>
            <div>
              <div class="sig-econ-hero__progress-head">
                <span>Captura de economia</span>
                <strong>{{ savingsCapturePct }}</strong>
              </div>
              <div class="sig-progress-track" role="progressbar" [attr.aria-valuenow]="savingsCaptureRate" aria-valuemin="0" aria-valuemax="100">
                <div class="sig-progress-fill" [style.width.%]="savingsCaptureRate"></div>
              </div>
              <p class="sig-econ-hero__progress-hint">
                {{ brl(doneSavings) }} realizados de {{ brl(totalSavings) }} estimados · {{ openActions }} ação(ões) em aberto
              </p>
            </div>
            <div class="sig-econ-hero__score">
              <p class="sig-econ-hero__score-value" [style.color]="healthColor">{{ savingsCaptureRate | number:'1.0-0' }}%</p>
              <p class="sig-econ-hero__score-label">Economia capturada</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div class="sig-chart-panel lg:col-span-2">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Orçamento por categoria</h3>
                <span class="sig-chart-panel__meta">Planejamento anual (R$)</span>
              </div>
              <app-bar-chart [data]="budgetChartData" prefix="R$ "></app-bar-chart>
            </div>
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Ações por status</h3>
                <span class="sig-chart-panel__meta">{{ panelActionCount }} ação(ões)</span>
              </div>
              <app-donut-chart [data]="statusChartData" centerLabel="Ações"></app-donut-chart>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3" *ngIf="operationalCostChart.length">
            <div class="sig-chart-panel lg:col-span-2">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Custos operacionais mensais</h3>
                <span class="sig-chart-panel__meta">Mesma base do Painel · {{ brl(operationalMonthlyCost) }}/mês</span>
              </div>
              <app-bar-chart [data]="operationalCostChart" prefix="R$ "></app-bar-chart>
            </div>
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Pagamentos {{ currentYear }}</h3>
                <span class="sig-chart-panel__meta">Registros financeiros</span>
              </div>
              <div class="sig-metric-row mb-0">
                <div class="sig-metric-tile">
                  <p class="sig-metric-tile__label">Total registrado</p>
                  <p class="sig-metric-tile__value">{{ brl(paymentsYearTotal) }}</p>
                  <p class="sig-metric-tile__hint">{{ payments.length }} pagamento(s)</p>
                </div>
                <div class="sig-metric-tile">
                  <p class="sig-metric-tile__label">vs. operacional anual</p>
                  <p class="sig-metric-tile__value">{{ paymentsVsOperationalPct }}</p>
                  <p class="sig-metric-tile__hint">Pagamentos / custo SAM anualizado</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Evolução do ROI</h3>
                <span class="sig-chart-panel__meta">Economia estimada / base financeira</span>
              </div>
              <app-line-chart [data]="roiTrendData" suffix="%" strokeColor="#8b5cf6"></app-line-chart>
            </div>
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Evolução CAPEX x OPEX</h3>
                <span class="sig-chart-panel__meta">Por ano · classificação automática</span>
              </div>
              <app-multi-line-chart [series]="capexOpexTrendSeries" prefix="R$ "></app-multi-line-chart>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3" *ngIf="capexOpexChartData.length || contractTypeChartData.length">
            <div class="sig-chart-panel" *ngIf="capexOpexChartData.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">CAPEX vs OPEX</h3>
                <span class="sig-chart-panel__meta">{{ brl(capexOpexTotal) }} total</span>
              </div>
              <app-donut-chart [data]="capexOpexChartData" centerLabel="Base" [centerValue]="brl(capexOpexTotal)"></app-donut-chart>
            </div>
            <div class="sig-chart-panel" *ngIf="contractTypeChartData.length" [class.lg:col-span-2]="capexOpexChartData.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Contratos anualizados por tipo</h3>
                <span class="sig-chart-panel__meta">{{ brl(annualContractCost) }} em contratos</span>
              </div>
              <app-bar-chart [data]="contractTypeChartData" prefix="R$ "></app-bar-chart>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="sig-chart-panel">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Economia por categoria</h3>
                <span class="sig-chart-panel__meta">{{ brl(openSavings) }} ainda em aberto</span>
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

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div class="sig-chart-panel lg:col-span-2" *ngIf="quickWins.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Quick wins</h3>
                <span class="sig-chart-panel__meta">Alto retorno · esforço S ou M</span>
              </div>
              <div class="d-flex flex-column gap-2">
                <article *ngFor="let a of quickWins" class="sig-econ-quick-win">
                  <div>
                    <p class="sig-econ-quick-win__title">{{ a.title }}</p>
                    <p class="sig-econ-quick-win__meta">
                      {{ a.category }} · Esforço {{ a.effort }} · {{ a.priority }}
                      <span *ngIf="a.owner"> · {{ a.owner }}</span>
                    </p>
                  </div>
                  <span class="sig-econ-quick-win__savings">{{ brl(a.estimatedSavings) }}</span>
                </article>
              </div>
            </div>

            <div class="sig-chart-panel" [class.lg:col-span-3]="!quickWins.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Matriz esforço × impacto</h3>
                <span class="sig-chart-panel__meta">{{ openActions }} em aberto</span>
              </div>
              <div class="sig-econ-matrix">
                <div class="sig-econ-matrix__cell is-highlight">
                  <p class="sig-econ-matrix__title">Quick wins</p>
                  <p class="sig-econ-matrix__count">{{ matrixQuick.count }}</p>
                  <p class="sig-econ-matrix__savings">{{ brl(matrixQuick.savings) }}</p>
                </div>
                <div class="sig-econ-matrix__cell">
                  <p class="sig-econ-matrix__title">Estratégicas</p>
                  <p class="sig-econ-matrix__count">{{ matrixStrategic.count }}</p>
                  <p class="sig-econ-matrix__savings">{{ brl(matrixStrategic.savings) }}</p>
                </div>
                <div class="sig-econ-matrix__cell">
                  <p class="sig-econ-matrix__title">Complementares</p>
                  <p class="sig-econ-matrix__count">{{ matrixFill.count }}</p>
                  <p class="sig-econ-matrix__savings">{{ brl(matrixFill.savings) }}</p>
                </div>
                <div class="sig-econ-matrix__cell">
                  <p class="sig-econ-matrix__title">Reavaliar</p>
                  <p class="sig-econ-matrix__count">{{ matrixReconsider.count }}</p>
                  <p class="sig-econ-matrix__savings">{{ brl(matrixReconsider.savings) }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="sig-chart-panel" *ngIf="upcomingActions.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Próximos prazos (60 dias)</h3>
                <span class="sig-chart-panel__meta">{{ overdueCount }} vencida(s)</span>
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
                    <span [class]="priorityBadge(a.priority)">{{ a.priority }}</span>
                    · Esforço {{ a.effort }}
                    · {{ a.dueDate | date:'dd/MM/yyyy' }}
                    · {{ brl(a.estimatedSavings) }}
                    <span *ngIf="a._overdue"> · <strong class="text-danger">Vencida</strong></span>
                  </p>
                </article>
              </div>
            </div>
            <div class="sig-chart-panel" [class.lg:col-span-2]="!upcomingActions.length">
              <div class="sig-chart-panel__head">
                <h3 class="sig-chart-title">Insights executivos</h3>
              </div>
              <div class="sig-econ-insights">
                <article class="sig-econ-insight">
                  <span class="sig-econ-insight__icon"><i class="fas fa-server" aria-hidden="true"></i></span>
                  <p class="sig-econ-insight__text">
                    Custo operacional mensal: <strong>{{ brl(operationalMonthlyCost) }}</strong>
                    (Serv. {{ brl(operationalBreakdown.servers) }} · Lic. {{ brl(operationalBreakdown.licenses) }} · Dom. {{ brl(operationalBreakdown.domains) }})
                    — alinhado ao Painel principal.
                  </p>
                </article>
                <article class="sig-econ-insight">
                  <span class="sig-econ-insight__icon"><i class="fas fa-wallet" aria-hidden="true"></i></span>
                  <p class="sig-econ-insight__text">
                    Orçamento planejado: <strong>{{ brl(totalBudget) }}</strong> em
                    <strong>{{ budgetCategories }}</strong> categoria(s).
                    <span *ngIf="topCategory"> Maior fatia: <strong>{{ topCategory.label }}</strong> ({{ brl(topCategory.value) }}).</span>
                  </p>
                </article>
                <article class="sig-econ-insight">
                  <span class="sig-econ-insight__icon"><i class="fas fa-piggy-bank" aria-hidden="true"></i></span>
                  <p class="sig-econ-insight__text">
                    Potencial de economia: <strong>{{ brl(totalSavings) }}</strong> ({{ savingsRateLabel }}).
                    Já capturados <strong>{{ brl(doneSavings) }}</strong> ({{ savingsCapturePct }}).
                  </p>
                </article>
                <article class="sig-econ-insight" *ngIf="topSavingAction">
                  <span class="sig-econ-insight__icon"><i class="fas fa-bolt" aria-hidden="true"></i></span>
                  <p class="sig-econ-insight__text">
                    Maior oportunidade: <strong>{{ topSavingAction.title }}</strong>
                    — {{ brl(topSavingAction.estimatedSavings) }} · {{ topSavingAction.priority }} · esforço {{ topSavingAction.effort }}.
                  </p>
                </article>
                <article class="sig-econ-insight" *ngIf="capexOpexTotal">
                  <span class="sig-econ-insight__icon"><i class="fas fa-balance-scale" aria-hidden="true"></i></span>
                  <p class="sig-econ-insight__text">
                    Mix CAPEX/OPEX: <strong>{{ brl(capexTotal) }}</strong> investimento vs
                    <strong>{{ brl(opexTotal) }}</strong> operacional
                    <span *ngIf="otherSpendTotal"> (+ {{ brl(otherSpendTotal) }} outros)</span>.
                  </p>
                </article>
              </div>
            </div>
          </div>

          <div class="sig-list-card">
            <div class="sig-chart-panel__head px-3 pt-3">
              <h3 class="sig-chart-title mb-0">Top ações por economia estimada</h3>
              <span class="sig-chart-panel__meta">{{ panelActionCount }} ações · {{ brl(maxActionSavings) }} máx.</span>
            </div>
            <div class="sig-table-wrap">
              <table class="sig-table">
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Categoria</th>
                    <th>Prioridade</th>
                    <th>Esforço</th>
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
                    <td>{{ a.effort }}</td>
                    <td><span [class]="statusBadge(a.status)">{{ a.status }}</span></td>
                    <td>{{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : '—' }}</td>
                    <td class="text-end fw-medium">
                      <span class="sig-econ-savings-bar" aria-hidden="true">
                        <span class="sig-econ-savings-bar__fill" [style.width.%]="savingsBarPct(a.estimatedSavings)"></span>
                      </span>
                      {{ brl(a.estimatedSavings) }}
                    </td>
                  </tr>
                  <tr *ngIf="!topActions.length">
                    <td colspan="7" class="sig-table-empty">Nenhuma ação cadastrada</td>
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
                    <div class="sig-row-actions">
                      <button type="button" (click)="openEditBudget(b)" class="sig-link-action" title="Editar">
                        <i class="fas fa-pen" aria-hidden="true"></i>
                        <span>Editar</span>
                      </button>
                      <button type="button" (click)="askDeleteBudget(b)" class="sig-link-action sig-link-action--danger" title="Excluir">
                        <i class="fas fa-trash-alt" aria-hidden="true"></i>
                        <span>Excluir</span>
                      </button>
                    </div>
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
                    <div class="sig-row-actions">
                      <button
                        *ngIf="!isDone(a.status)"
                        type="button"
                        (click)="markActionDone(a)"
                        [disabled]="actionDoneId === a.id"
                        class="sig-link-action sig-link-action--success"
                        title="Concluir"
                      >
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>{{ actionDoneId === a.id ? 'Concluindo...' : 'Concluir' }}</span>
                      </button>
                      <button type="button" (click)="openEditAction(a)" class="sig-link-action" title="Editar">
                        <i class="fas fa-pen" aria-hidden="true"></i>
                        <span>Editar</span>
                      </button>
                      <button type="button" (click)="askDeleteAction(a)" class="sig-link-action sig-link-action--danger" title="Excluir">
                        <i class="fas fa-trash-alt" aria-hidden="true"></i>
                        <span>Excluir</span>
                      </button>
                    </div>
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

      <!-- ========== CONTRATOS ========== -->
      <ng-container *ngIf="!loading && tab === 'contratos'">
        <app-data-toolbar
          searchPlaceholder="Buscar fornecedor, objeto, tipo..."
          [search]="searchContract"
          [filters]="contractFilters"
          [filterValues]="filterContract"
          (searchChange)="searchContract = $event"
          (filterChange)="filterContract[$event.key] = $event.value"
          (newClick)="openNewContract()"
          (exportClick)="exportContracts()"
          (importFile)="importContracts($event)"
        ></app-data-toolbar>

        <div class="sig-list-card">
          <div class="sig-table-wrap">
            <table class="sig-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Objeto</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Centro de custo</th>
                  <th>Vencimento</th>
                  <th class="text-end">Custo mensal</th>
                  <th class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of filteredContracts">
                  <td class="fw-medium">{{ c.supplier }}</td>
                  <td>{{ c.object }}</td>
                  <td>{{ c.type }}</td>
                  <td><span [class]="contractStatusBadge(c.status)">{{ c.status }}</span></td>
                  <td>{{ c.costCenter || '—' }}</td>
                  <td>{{ c.endDate ? (c.endDate | date:'dd/MM/yyyy') : '—' }}</td>
                  <td class="text-end fw-medium">{{ brl(c.monthlyCost) }}</td>
                  <td class="text-end">
                    <div class="sig-row-actions">
                      <button type="button" (click)="openEditContract(c)" class="sig-link-action" title="Editar">
                        <i class="fas fa-pen" aria-hidden="true"></i>
                        <span>Editar</span>
                      </button>
                      <button type="button" (click)="askDeleteContract(c)" class="sig-link-action sig-link-action--danger" title="Excluir">
                        <i class="fas fa-trash-alt" aria-hidden="true"></i>
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!filteredContracts.length">
                  <td colspan="8" class="sig-table-empty">Nenhum contrato — alimenta o painel financeiro e os alertas</td>
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
      <div class="sig-modal-form sig-modal-grid">
        <label class="text-sm md:col-span-2">
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
        <label class="text-sm md:col-span-2">
          Orçamento anual (R$) *
          <input
            type="number"
            step="0.01"
            [(ngModel)]="budgetForm.annual_budget"
            class="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
        <label class="text-sm md:col-span-2">
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
      <div class="sig-modal-form sig-modal-grid">
        <label class="text-sm md:col-span-2">
          Título *
          <input [(ngModel)]="actionForm.title" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm md:col-span-2">
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
      [confirming]="deletingBudget"
      (cancel)="confirmBudget = false"
      (confirm)="doDeleteBudget()"
    ></app-confirm>

    <app-confirm
      [open]="confirmAction"
      title="Excluir ação"
      [message]="'Excluir «' + (toDeleteAction?.title || '') + '»?'"
      [confirming]="deletingAction"
      (cancel)="confirmAction = false"
      (confirm)="doDeleteAction()"
    ></app-confirm>

    <app-modal
      [open]="contractModal"
      [title]="contractForm.id ? 'Editar contrato' : 'Novo contrato'"
      [saving]="saving"
      (close)="contractModal = false"
      (save)="saveContract()"
    >
      <div class="sig-modal-form sig-modal-grid">
        <label class="text-sm md:col-span-2">
          Fornecedor *
          <input [(ngModel)]="contractForm.supplier" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm md:col-span-2">
          Objeto *
          <input [(ngModel)]="contractForm.object" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Tipo *
          <select [(ngModel)]="contractForm.type" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option *ngFor="let t of contractTypeOptions" [value]="t">{{ t }}</option>
          </select>
        </label>
        <label class="text-sm">
          Status
          <select [(ngModel)]="contractForm.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option *ngFor="let s of contractStatusOptions" [value]="s">{{ s }}</option>
          </select>
        </label>
        <label class="text-sm">
          Centro de custo
          <input [(ngModel)]="contractForm.cost_center" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">
          Vencimento
          <input type="date" [(ngModel)]="contractForm.end_date" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm md:col-span-2">
          Custo mensal (R$)
          <input type="number" step="0.01" [(ngModel)]="contractForm.monthly_cost" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
      </div>
    </app-modal>

    <app-confirm
      [open]="confirmContract"
      title="Excluir contrato"
      [message]="'Excluir contrato de ' + (toDeleteContract?.supplier || 'fornecedor') + '?'"
      [confirming]="deletingContract"
      (cancel)="confirmContract = false"
      (confirm)="doDeleteContract()"
    ></app-confirm>
  `,
})
export class EconomistComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  readonly brandHex = '#023ed8';

  tab: TabId = 'visao';
  panelYear: number | 'all' = 'all';
  budgets: Budget[] = [];
  actions: ActionItem[] = [];
  contracts: FinancialContract[] = [];
  licenses: License[] = [];
  servers: Server[] = [];
  domains: Domain[] = [];
  payments: Payment[] = [];
  ti: TiMetrics | null = null;
  loading = true;
  private sub!: Subscription;
  private metricsSub!: Subscription;

  totalBudget = 0;
  totalSavings = 0;
  savingsRate = 0;
  financialBase = 0;
  operationalMonthlyCost = 0;
  operationalAnnual = 0;
  operationalCostHint = '';
  paymentsYearTotal = 0;
  savingsCaptureRate = 0;
  healthScore = 0;
  healthHint = '';
  maxActionSavings = 0;
  openActions = 0;
  doneActions = 0;
  doneSavings = 0;
  openSavings = 0;
  overdueCount = 0;
  currentYear = new Date().getFullYear();
  currentYearBudget = 0;
  budgetCategories = 0;
  panelBudgetCount = 0;
  panelActionCount = 0;
  roi = 0;
  realizedRoi = 0;
  annualContractCost = 0;
  capexTotal = 0;
  opexTotal = 0;
  otherSpendTotal = 0;
  capexOpexTotal = 0;
  operationalBreakdown = { servers: 0, licenses: 0, domains: 0 };

  budgetChartData: ChartDatum[] = [];
  operationalCostChart: ChartDatum[] = [];
  savingsChartData: ChartDatum[] = [];
  statusChartData: ChartDatum[] = [];
  priorityChartData: ChartDatum[] = [];
  roiChartData: ChartDatum[] = [];
  roiTrendData: ChartDatum[] = [];
  capexOpexChartData: ChartDatum[] = [];
  capexOpexTrendSeries: ChartSeries[] = [];
  contractTypeChartData: ChartDatum[] = [];
  topActions: ActionItem[] = [];
  quickWins: ActionItem[] = [];
  upcomingActions: (ActionItem & { _overdue?: boolean; _soon?: boolean })[] = [];
  topCategory: ChartDatum | null = null;
  topSavingAction: ActionItem | null = null;
  matrixQuick = { count: 0, savings: 0 };
  matrixStrategic = { count: 0, savings: 0 };
  matrixFill = { count: 0, savings: 0 };
  matrixReconsider = { count: 0, savings: 0 };

  searchBudget = '';
  filterBudget: Record<string, string> = {};
  searchAction = '';
  filterAction: Record<string, string> = {};
  searchContract = '';
  filterContract: Record<string, string> = {};

  budgetModal = false;
  actionModal = false;
  contractModal = false;
  confirmBudget = false;
  confirmAction = false;
  confirmContract = false;
  saving = false;
  deletingBudget = false;
  deletingAction = false;
  deletingContract = false;
  actionDoneId: string | null = null;
  budgetForm: any = {};
  actionForm: any = {};
  contractForm: any = {};
  toDeleteBudget: Budget | null = null;
  toDeleteAction: ActionItem | null = null;
  toDeleteContract: FinancialContract | null = null;

  readonly statusOptions = ['Aberto', 'Em andamento', 'Concluída', 'Cancelada', 'Pendente'];
  readonly categoryOptions = [
    'Otimização de custos',
    'Infraestrutura',
    'Licenciamento',
    'Cloud',
    'Segurança',
    'Contratos',
    'Outros',
  ];
  readonly contractTypeOptions = ['SaaS', 'Suporte', 'Cloud', 'Telecom', 'Licenciamento', 'Outros'];
  readonly contractStatusOptions = ['Ativo', 'Renovando', 'Encerrado', 'Suspenso'];

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
    private ux: UxFeedbackService,
    private tiMetrics: TiMetricsService,
  ) {}

  ngOnInit() {
    this.sub = this.dashboard.data$.subscribe((d) => {
      this.budgets = d.budgets;
      this.actions = d.actions;
      this.contracts = d.contracts || [];
      this.licenses = d.licenses || [];
      this.servers = d.servers || [];
      this.domains = d.domains || [];
      this.payments = d.payments || [];
      this.loading = d.loading;
      if (!d.loading) this.compute();
    });
    this.metricsSub = this.tiMetrics.metrics$.subscribe((m) => (this.ti = m));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.metricsSub?.unsubscribe();
  }

  get hasData() {
    return (
      this.budgets.length > 0 ||
      this.actions.length > 0 ||
      this.contracts.length > 0 ||
      this.licenses.length > 0 ||
      this.servers.length > 0 ||
      this.domains.length > 0 ||
      this.payments.length > 0
    );
  }

  get savingsRateLabel() {
    return `${this.savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do orçamento`;
  }

  get savingsRatePct() {
    return `${this.savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  get savingsCapturePct() {
    return `${this.savingsCaptureRate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  }

  get healthColor() {
    return this.healthScore >= 80 ? '#10b981' : this.healthScore >= 50 ? '#f59e0b' : '#ef4444';
  }

  get paymentsVsOperationalPct() {
    if (!this.operationalAnnual) return '—';
    const pct = (this.paymentsYearTotal / this.operationalAnnual) * 100;
    return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  }

  get yearOptions(): number[] {
    const years = new Set<number>();
    this.budgets.forEach((b) => years.add(b.year));
    this.actions.forEach((a) => years.add(this.actionYear(a)));
    return Array.from(years).sort((a, b) => b - a);
  }

  get panelYearLabel(): string {
    if (this.panelYear === 'all') return 'Consolidado · alinhado ao índice TI';
    return `Filtrando ${this.panelYear} · KPIs do período`;
  }

  get useGlobalMetrics() {
    return this.panelYear === 'all';
  }

  get displayOperationalMonthly() {
    return this.useGlobalMetrics ? (this.ti?.operationalMonthlyCost ?? this.operationalMonthlyCost) : this.operationalMonthlyCost;
  }

  get displayOperationalHint() {
    return this.useGlobalMetrics ? (this.ti?.operationalCostHint ?? this.operationalCostHint) : this.operationalCostHint;
  }

  get displayBudget() {
    return this.useGlobalMetrics ? (this.ti?.totalBudget ?? this.totalBudget) : this.totalBudget;
  }

  get displayBudgetHint() {
    return this.panelBudgetCount + ' linha(s) · ' + this.budgetCategories + ' categoria(s)';
  }

  get displaySavings() {
    return this.useGlobalMetrics ? (this.ti?.totalSavings ?? this.totalSavings) : this.totalSavings;
  }

  get displayFinancialHealth() {
    return this.useGlobalMetrics ? (this.ti?.financialHealthScore ?? this.healthScore) : this.healthScore;
  }

  get displayFinancialHealthColor() {
    return healthScoreColor(this.displayFinancialHealth);
  }

  get displayFinancialHealthHint() {
    if (this.useGlobalMetrics && this.ti) {
      return this.ti.financialHealthHint.replace(/^Financeiro · /, '');
    }
    return this.healthHint;
  }

  get roiPct() {
    return `${this.roi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  get roiHint() {
    return `Realizado: ${this.realizedRoi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
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

  get contractFilters() {
    return [
      {
        key: 'status',
        label: 'Status',
        options: this.contractStatusOptions.map((s) => ({ value: s, label: s })),
      },
      {
        key: 'type',
        label: 'Tipo',
        options: this.contractTypeOptions.map((t) => ({ value: t, label: t })),
      },
    ];
  }

  get filteredContracts() {
    const q = this.searchContract.toLowerCase();
    return this.contracts.filter(
      (c) =>
        (!q ||
          c.supplier?.toLowerCase().includes(q) ||
          c.object?.toLowerCase().includes(q) ||
          c.type?.toLowerCase().includes(q)) &&
        (!this.filterContract['status'] || c.status === this.filterContract['status']) &&
        (!this.filterContract['type'] || c.type === this.filterContract['type']),
    );
  }

  brl(v: number) {
    return formatBrl(v);
  }

  savingsBarPct(v: number) {
    if (!this.maxActionSavings) return 0;
    return Math.max(8, (v / this.maxActionSavings) * 100);
  }

  goToBudgets() {
    this.tab = 'orcamentos';
    this.openNewBudget();
  }

  goToActions() {
    this.tab = 'acoes';
    this.openNewAction();
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

  contractStatusBadge(s: string) {
    const k = (s || '').toLowerCase();
    if (k.includes('ativo')) return SigBadge.success;
    if (k.includes('renov')) return SigBadge.warning;
    if (k.includes('encerr') || k.includes('susp')) return SigBadge.danger;
    return SigBadge.neutral;
  }

  isDone(status: string) {
    const k = (status || '').toLowerCase();
    return k.startsWith('conclu');
  }

  isOpen(status: string) {
    return !this.isDone(status) && !(status || '').toLowerCase().includes('cancel');
  }

  private budgetsForPanel(): Budget[] {
    if (this.panelYear === 'all') return this.budgets;
    return this.budgets.filter((b) => b.year === this.panelYear);
  }

  private actionsForPanel(): ActionItem[] {
    if (this.panelYear === 'all') return this.actions;
    return this.actions.filter((a) => this.actionYear(a) === this.panelYear);
  }

  private includeRecurringCosts(): boolean {
    return this.panelYear === 'all' || this.panelYear === this.currentYear;
  }

  onPanelYearChange() {
    this.compute();
  }

  private compute() {
    const budgets = this.budgetsForPanel();
    const actions = this.actionsForPanel();
    const includeRecurring = this.includeRecurringCosts();

    this.totalBudget = budgets.reduce((s, b) => s + (b.annualBudget || 0), 0);
    this.totalSavings = actions.reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    this.savingsRate = this.totalBudget > 0 ? (this.totalSavings / this.totalBudget) * 100 : 0;

    this.operationalBreakdown = operationalCostBreakdown(this.servers, this.licenses, this.domains);

    const consolidated = consolidatedAnnualBase(
      budgets,
      includeRecurring ? this.servers : [],
      includeRecurring ? this.licenses : [],
      includeRecurring ? this.domains : [],
      includeRecurring ? this.contracts : [],
    );
    this.financialBase = consolidated.total;
    this.operationalMonthlyCost = includeRecurring ? consolidated.monthlyOperational : 0;
    this.operationalAnnual = includeRecurring ? consolidated.operationalAnnual : 0;
    this.annualContractCost = includeRecurring ? consolidated.contractsAnnual : 0;
    this.operationalCostHint = includeRecurring
      ? `Serv. ${formatBrl(this.operationalBreakdown.servers)} · Lic. ${formatBrl(this.operationalBreakdown.licenses)} · Dom. ${formatBrl(this.operationalBreakdown.domains)}`
      : 'Fora do período selecionado';
    this.paymentsYearTotal = paymentsYearTotal(this.payments, this.currentYear);

    this.openActions = actions.filter((a) => this.isOpen(a.status)).length;
    this.doneActions = actions.filter((a) => this.isDone(a.status)).length;
    this.doneSavings = actions
      .filter((a) => this.isDone(a.status))
      .reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    this.openSavings = actions
      .filter((a) => this.isOpen(a.status))
      .reduce((s, a) => s + (a.estimatedSavings || 0), 0);

    this.savingsCaptureRate =
      this.totalSavings > 0 ? Math.min(100, (this.doneSavings / this.totalSavings) * 100) : 0;

    this.currentYearBudget = this.budgets
      .filter((b) => b.year === this.currentYear)
      .reduce((s, b) => s + b.annualBudget, 0);

    const roiBase = this.financialBase;
    this.roi = roiBase > 0 ? (this.totalSavings / roiBase) * 100 : 0;
    this.realizedRoi = roiBase > 0 ? (this.doneSavings / roiBase) * 100 : 0;

    const cats = new Set(budgets.map((b) => b.category));
    this.budgetCategories = cats.size;
    this.panelBudgetCount = budgets.length;
    this.panelActionCount = actions.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in60 = new Date(today);
    in60.setDate(in60.getDate() + 60);

    this.overdueCount = 0;
    this.upcomingActions = actions
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

    const financial = computeFinancialHealth({
      actions,
      totalSavings: this.totalSavings,
      doneSavings: this.doneSavings,
      overdueCount: this.overdueCount,
      isDone: (s) => this.isDone(s),
      isOpen: (s) => this.isOpen(s),
    });
    this.healthScore = financial.score;
    this.healthHint = financial.hint.replace(/^Financeiro · /, '');

    this.operationalCostChart = includeRecurring
      ? [
          { label: 'Servidores', value: this.operationalBreakdown.servers, color: '#023ed8' },
          { label: 'Licenças', value: this.operationalBreakdown.licenses, color: '#8b5cf6' },
          { label: 'Domínios', value: this.operationalBreakdown.domains, color: '#06b6d4' },
        ].filter((d) => d.value > 0)
      : [];

    this.budgetChartData = this.groupChart(budgets, (b) => b.category, (b) => b.annualBudget);
    this.savingsChartData = this.groupChart(
      actions,
      (a) => a.category || 'Outros',
      (a) => a.estimatedSavings,
    );
    this.roiChartData = this.buildRoiChart(budgets, actions);
    this.capexOpexChartData = this.buildCapexOpexChart(budgets, includeRecurring);
    this.roiTrendData = this.buildRoiTrend(budgets, actions);
    this.capexOpexTrendSeries = this.buildCapexOpexTrend(budgets);
    this.contractTypeChartData = includeRecurring
      ? this.groupChart(
          this.contracts,
          (c) => c.type || 'Outros',
          (c) => (c.monthlyCost || 0) * 12,
        )
      : [];
    this.topCategory = this.budgetChartData[0] ?? null;

    const statusMap = this.countMap(actions, (a) => a.status || 'Aberto');
    this.statusChartData = Object.entries(statusMap).map(([label, value], i) => ({
      label,
      value,
      color: this.statusColors[label] || this.chartColors[i % this.chartColors.length],
    }));

    const priMap = this.countMap(actions, (a) => a.priority || 'Média');
    const priOrder = ['Alta', 'Média', 'Baixa'];
    this.priorityChartData = priOrder
      .filter((k) => priMap[k])
      .map((label, i) => ({
        label,
        value: priMap[label],
        color: ['#ef4444', '#f59e0b', '#10b981'][i] || this.chartColors[i],
      }));

    this.topActions = [...actions]
      .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
      .slice(0, 8);
    this.topSavingAction = this.topActions[0] ?? null;
    this.maxActionSavings = this.topActions[0]?.estimatedSavings || 0;

    this.quickWins = actions
      .filter(
        (a) =>
          this.isOpen(a.status) &&
          (a.effort === 'S' || a.effort === 'M') &&
          (a.estimatedSavings || 0) > 0,
      )
      .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
      .slice(0, 5);

    this.buildPriorityMatrix(actions);
  }

  private buildPriorityMatrix(actions: ActionItem[]) {
    const open = actions.filter((a) => this.isOpen(a.status));
    const savingsValues = open.map((a) => a.estimatedSavings || 0).sort((a, b) => a - b);
    const median = savingsValues.length ? savingsValues[Math.floor(savingsValues.length / 2)] : 0;

    const buckets = {
      quick: { count: 0, savings: 0 },
      strategic: { count: 0, savings: 0 },
      fill: { count: 0, savings: 0 },
      reconsider: { count: 0, savings: 0 },
    };

    for (const a of open) {
      const highImpact = (a.estimatedSavings || 0) >= median || a.priority === 'Alta';
      const lowEffort = a.effort === 'S' || a.effort === 'M';
      const savings = a.estimatedSavings || 0;
      if (highImpact && lowEffort) {
        buckets.quick.count++;
        buckets.quick.savings += savings;
      } else if (highImpact) {
        buckets.strategic.count++;
        buckets.strategic.savings += savings;
      } else if (lowEffort) {
        buckets.fill.count++;
        buckets.fill.savings += savings;
      } else {
        buckets.reconsider.count++;
        buckets.reconsider.savings += savings;
      }
    }

    this.matrixQuick = buckets.quick;
    this.matrixStrategic = buckets.strategic;
    this.matrixFill = buckets.fill;
    this.matrixReconsider = buckets.reconsider;
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

  private buildRoiChart(budgets: Budget[], actions: ActionItem[]): ChartDatum[] {
    const budgetByCategory = new Map<string, number>();
    const savingsByCategory = new Map<string, number>();

    for (const b of budgets) {
      const key = b.category || 'Outros';
      budgetByCategory.set(key, (budgetByCategory.get(key) || 0) + (b.annualBudget || 0));
    }

    for (const a of actions) {
      const key = a.category || 'Outros';
      savingsByCategory.set(key, (savingsByCategory.get(key) || 0) + (a.estimatedSavings || 0));
    }

    const byCategory = Array.from(budgetByCategory.entries())
      .map(([label, budget], i) => ({
        label,
        value: budget > 0 ? Math.round(((savingsByCategory.get(label) || 0) / budget) * 100) : 0,
        color: this.chartColors[i % this.chartColors.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const totalBudget = budgets.reduce((s, b) => s + (b.annualBudget || 0), 0);
    const totalSavings = actions.reduce((s, a) => s + (a.estimatedSavings || 0), 0);
    if (!byCategory.length && totalBudget > 0 && totalSavings > 0) {
      return [{ label: 'Carteira total', value: Math.round((totalSavings / totalBudget) * 100), color: this.brandHex }];
    }

    return byCategory;
  }

  private buildCapexOpexChart(budgets: Budget[], includeRecurring: boolean): ChartDatum[] {
    const spend = new Map<string, number>([
      ['CAPEX', 0],
      ['OPEX', 0],
      ['Outros', 0],
    ]);

    const add = (label: string, value: number) => {
      spend.set(label, (spend.get(label) || 0) + (value || 0));
    };

    for (const b of budgets) {
      add(classifySpendType(`${b.category} ${b.costCenter} ${b.notes || ''}`), b.annualBudget || 0);
    }

    if (includeRecurring) {
      add('OPEX', this.operationalAnnual);
      for (const c of this.contracts) {
        add(classifySpendType(`${c.type} ${c.object} ${c.costCenter} ${c.supplier}`), (c.monthlyCost || 0) * 12);
      }
      if (this.paymentsYearTotal) add('OPEX', this.paymentsYearTotal);
    }

    this.capexTotal = spend.get('CAPEX') || 0;
    this.opexTotal = spend.get('OPEX') || 0;
    this.otherSpendTotal = spend.get('Outros') || 0;
    this.capexOpexTotal = this.capexTotal + this.opexTotal + this.otherSpendTotal;

    return [
      { label: 'CAPEX', value: this.capexTotal, color: '#023ed8' },
      { label: 'OPEX', value: this.opexTotal, color: '#10b981' },
      { label: 'Outros', value: this.otherSpendTotal, color: '#64748b' },
    ].filter((d) => d.value > 0);
  }

  private buildRoiTrend(budgets: Budget[], actions: ActionItem[]): ChartDatum[] {
    return this.financialYears().map((year) => {
      const budget = budgets
        .filter((b) => b.year === year)
        .reduce((sum, b) => sum + (b.annualBudget || 0), 0);
      const savings = actions
        .filter((a) => this.actionYear(a) === year)
        .reduce((sum, a) => sum + (a.estimatedSavings || 0), 0);
      const contractBase = year === this.currentYear ? this.annualContractCost : 0;
      const operationalBase = year === this.currentYear ? this.operationalAnnual : 0;
      const base = budget + contractBase + operationalBase;

      return {
        label: String(year),
        value: base > 0 ? Math.round((savings / base) * 100) : 0,
        color: '#8b5cf6',
      };
    });
  }

  private buildCapexOpexTrend(budgets: Budget[]): ChartSeries[] {
    const years = this.financialYears();
    const capexByYear = new Map<number, number>();
    const opexByYear = new Map<number, number>();
    const includeRecurring = this.includeRecurringCosts();

    const add = (year: number, type: 'CAPEX' | 'OPEX' | 'Outros', value: number) => {
      if (type === 'CAPEX') capexByYear.set(year, (capexByYear.get(year) || 0) + (value || 0));
      if (type === 'OPEX') opexByYear.set(year, (opexByYear.get(year) || 0) + (value || 0));
    };

    for (const b of budgets) {
      add(b.year, classifySpendType(`${b.category} ${b.costCenter} ${b.notes || ''}`), b.annualBudget || 0);
    }

    if (includeRecurring) {
      add(this.currentYear, 'OPEX', this.operationalAnnual);
      for (const c of this.contracts) {
        add(this.currentYear, classifySpendType(`${c.type} ${c.object} ${c.costCenter} ${c.supplier}`), (c.monthlyCost || 0) * 12);
      }
    }

    return [
      {
        label: 'CAPEX',
        color: '#023ed8',
        data: years.map((year) => ({ label: String(year), value: capexByYear.get(year) || 0 })),
      },
      {
        label: 'OPEX',
        color: '#10b981',
        data: years.map((year) => ({ label: String(year), value: opexByYear.get(year) || 0 })),
      },
    ];
  }

  private financialYears(): number[] {
    const years = new Set<number>();
    this.budgets.forEach((b) => years.add(b.year));
    this.actions.forEach((a) => years.add(this.actionYear(a)));
    if (this.contracts.length || this.servers.length || this.licenses.length || this.domains.length) {
      years.add(this.currentYear);
    }
    if (!years.size) years.add(this.currentYear);
    return Array.from(years).sort((a, b) => a - b);
  }

  private actionYear(action: ActionItem): number {
    const rawDate = action.dueDate || action.createdAt;
    const year = rawDate ? new Date(rawDate).getFullYear() : NaN;
    return Number.isFinite(year) ? year : this.currentYear;
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
    if (!this.ux.requireAll([[this.budgetForm.category, 'a categoria'], [this.budgetForm.cost_center, 'o centro de custo']])) return;
    this.saving = true;
    try {
      const ok = await this.crud.upsert('orcamentos', { ...this.budgetForm });
      if (ok) this.budgetModal = false;
    } finally {
      this.saving = false;
    }
  }

  askDeleteBudget(b: Budget) {
    this.toDeleteBudget = b;
    this.confirmBudget = true;
  }

  async doDeleteBudget() {
    if (!this.toDeleteBudget || this.deletingBudget) return;
    this.deletingBudget = true;
    const ok = await this.crud.remove('orcamentos', this.toDeleteBudget.id);
    this.deletingBudget = false;
    if (ok) { this.confirmBudget = false; this.toDeleteBudget = null; }
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
    else this.ux.noImportRows('orçamentos');
  }

  openNewAction() {
    this.actionForm = {
      title: '',
      description: '',
      category: 'Otimização de custos',
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
    if (!this.ux.require(this.actionForm.title, 'o título da ação')) return;
    this.saving = true;
    try {
      const o = { ...this.actionForm };
      if (!o.due_date) o.due_date = null;
      const ok = await this.crud.upsert('acoes_economista', o);
      if (ok) this.actionModal = false;
    } finally {
      this.saving = false;
    }
  }

  async markActionDone(a: ActionItem) {
    if (this.actionDoneId) return;
    this.actionDoneId = a.id;
    try {
      await this.crud.upsert('acoes_economista', { id: a.id, status: 'Concluída' });
    } finally {
      this.actionDoneId = null;
    }
  }

  askDeleteAction(a: ActionItem) {
    this.toDeleteAction = a;
    this.confirmAction = true;
  }

  async doDeleteAction() {
    if (!this.toDeleteAction || this.deletingAction) return;
    this.deletingAction = true;
    const ok = await this.crud.remove('acoes_economista', this.toDeleteAction.id);
    this.deletingAction = false;
    if (ok) { this.confirmAction = false; this.toDeleteAction = null; }
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
        category: r['Categoria'] || r['category'] || 'Otimização de custos',
        priority: r['Prioridade'] || r['priority'] || 'Média',
        effort: r['Esforco'] || r['effort'] || 'M',
        status: r['Status'] || r['status'] || 'Aberto',
        owner: r['Responsavel'] || r['owner'] || '',
        due_date: r['Prazo'] || r['due_date'] || null,
        estimated_savings: Number(r['Economia'] || r['estimated_savings'] || 0),
      }))
      .filter((r) => r.title);
    if (payload.length) await this.crud.bulkInsert('acoes_economista', payload);
    else this.ux.noImportRows('ações');
  }

  openNewContract() {
    this.contractForm = {
      supplier: '',
      object: '',
      type: 'SaaS',
      status: 'Ativo',
      cost_center: 'CC-TI',
      end_date: '',
      monthly_cost: 0,
    };
    this.contractModal = true;
  }

  openEditContract(c: FinancialContract) {
    this.contractForm = {
      id: c.id,
      supplier: c.supplier,
      object: c.object,
      type: c.type,
      status: c.status,
      cost_center: c.costCenter,
      end_date: c.endDate || '',
      monthly_cost: c.monthlyCost,
    };
    this.contractModal = true;
  }

  async saveContract() {
    if (!this.ux.requireAll([
      [this.contractForm.supplier, 'o fornecedor'],
      [this.contractForm.object, 'o objeto'],
      [this.contractForm.type, 'o tipo'],
    ])) return;
    this.saving = true;
    try {
      const payload = { ...this.contractForm };
      if (!payload.end_date) payload.end_date = null;
      const ok = await this.crud.upsert('contratos', payload);
      if (ok) this.contractModal = false;
    } finally {
      this.saving = false;
    }
  }

  askDeleteContract(c: FinancialContract) {
    this.toDeleteContract = c;
    this.confirmContract = true;
  }

  async doDeleteContract() {
    if (!this.toDeleteContract || this.deletingContract) return;
    this.deletingContract = true;
    const ok = await this.crud.remove('contratos', this.toDeleteContract.id);
    this.deletingContract = false;
    if (ok) {
      this.confirmContract = false;
      this.toDeleteContract = null;
    }
  }

  exportContracts() {
    exportToCSV(
      this.filteredContracts.map((c) => ({
        Fornecedor: c.supplier,
        Objeto: c.object,
        Tipo: c.type,
        Status: c.status,
        CentroCusto: c.costCenter,
        Vencimento: c.endDate,
        CustoMensal: c.monthlyCost,
      })),
      'contratos',
    );
  }

  async importContracts(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows
      .map((r) => ({
        supplier: r['Fornecedor'] || r['supplier'],
        object: r['Objeto'] || r['object'],
        type: r['Tipo'] || r['type'] || 'Outros',
        status: r['Status'] || r['status'] || 'Ativo',
        cost_center: r['CentroCusto'] || r['cost_center'] || 'CC-TI',
        end_date: r['Vencimento'] || r['end_date'] || null,
        monthly_cost: Number(r['CustoMensal'] || r['monthly_cost'] || 0),
      }))
      .filter((r) => r.supplier && r.object);
    if (payload.length) await this.crud.bulkInsert('contratos', payload);
    else this.ux.noImportRows('contratos');
  }
}
