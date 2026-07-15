import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DashboardService, ActionItem } from './dashboard.service';
import {
  consolidatedAnnualBase,
  formatBrl,
  operationalCostBreakdown,
  operationalMonthlyCost,
  paymentsYearTotal,
} from '../utils/financial.util';
import {
  computeCompositeHealth,
  computeFinancialHealth,
  computeGovernanceHealth,
  computeOperationalHealth,
  healthScoreColor,
  normalizeRiskSeverity,
} from '../utils/health.util';
import { countExpiredDomains, countExpiringDomains } from '../utils/domain.util';
import type { ChartDatum } from '../components/charts.component';

export interface TiMetrics {
  loading: boolean;
  operationalMonthlyCost: number;
  operationalAnnual: number;
  operationalBreakdown: { servers: number; licenses: number; domains: number };
  operationalCostHint: string;
  costByCategory: ChartDatum[];
  financialBase: number;
  totalBudget: number;
  totalSavings: number;
  doneSavings: number;
  openActions: number;
  overdueActions: number;
  paymentsYearTotal: number;
  paymentsOverdue: number;
  paymentsPending: number;
  paymentsPaidMonth: number;
  operationalHealthScore: number;
  operationalHealthHint: string;
  governanceHealthScore: number;
  governanceHealthHint: string;
  financialHealthScore: number;
  financialHealthHint: string;
  compositeHealthScore: number;
  compositeHealthHint: string;
  healthColor: string;
  /** Total de alertas críticos (alinhado à página Alertas). */
  criticalAlerts: number;
  /** Críticos ainda não lidos — usados na saúde operacional. */
  unreadCriticalAlerts: number;
  criticalRisks: number;
  domainsExpiring: number;
  expiredDomains: number;
  unusedLicenses: number;
  assetsInUse: number;
}

function isDone(status: string): boolean {
  return (status || '').toLowerCase().startsWith('conclu');
}

function isOpen(status: string): boolean {
  return !isDone(status) && !(status || '').toLowerCase().includes('cancel');
}

function countOverdueActions(actions: ActionItem[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return actions.filter((a) => {
    if (!isOpen(a.status) || !a.dueDate) return false;
    const d = new Date(a.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }).length;
}

@Injectable({ providedIn: 'root' })
export class TiMetricsService {
  readonly metrics$: Observable<TiMetrics>;

  constructor(private dashboard: DashboardService) {
    this.metrics$ = this.dashboard.data$.pipe(map((d) => this.buildMetrics(d)));
  }

  private buildMetrics(d: {
    assets: any[];
    domains: any[];
    licenses: any[];
    servers: any[];
    contracts: any[];
    alerts: any[];
    budgets: any[];
    actions: any[];
    risks: any[];
    payments: any[];
    loading: boolean;
  }): TiMetrics {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const breakdown = operationalCostBreakdown(d.servers, d.licenses, d.domains);
    const monthlyOperational = operationalMonthlyCost(d.servers, d.licenses, d.domains);
    const operationalCostHint = `Serv. ${formatBrl(breakdown.servers)} · Lic. ${formatBrl(breakdown.licenses)} · Dom. ${formatBrl(breakdown.domains)}`;

    const costByCategory: ChartDatum[] = [
      { label: 'Servidores', value: breakdown.servers, color: '#023ed8' },
      { label: 'Licenças', value: breakdown.licenses, color: '#8b5cf6' },
      { label: 'Domínios', value: breakdown.domains, color: '#06b6d4' },
    ].filter((c) => c.value > 0);

    const consolidated = consolidatedAnnualBase(
      d.budgets,
      d.servers,
      d.licenses,
      d.domains,
      d.contracts,
    );

    const totalSavings = d.actions.reduce((s: number, a: ActionItem) => s + (a.estimatedSavings || 0), 0);
    const doneSavings = d.actions
      .filter((a: ActionItem) => isDone(a.status))
      .reduce((s: number, a: ActionItem) => s + (a.estimatedSavings || 0), 0);
    const openActions = d.actions.filter((a: ActionItem) => isOpen(a.status)).length;
    const overdueActions = countOverdueActions(d.actions);

    const assetsInUse = d.assets.filter((a: any) => a.status === 'Em uso').length;
    const domainsExpiring = countExpiringDomains(d.domains);
    const expiredDomains = countExpiredDomains(d.domains);
    const unusedLicenses = d.licenses.reduce(
      (s: number, l: any) => s + Math.max(0, l.totalLicenses - l.usedLicenses),
      0,
    );
    // Só alertas pendentes (não concluídos) entram nas métricas.
    const unreadCriticalAlerts = d.alerts.filter(
      (a: any) => a.severidade === 'critico' && !a.lida,
    ).length;
    const criticalAlerts = unreadCriticalAlerts;

    const operationalHealth = computeOperationalHealth({
      assets: d.assets,
      domains: d.domains,
      servers: d.servers,
      alerts: d.alerts,
      assetsInUse,
      criticalAlerts: unreadCriticalAlerts,
      domainsExpiring,
    });
    const governanceHealth = computeGovernanceHealth(d.risks);
    const financialHealth = computeFinancialHealth({
      actions: d.actions,
      totalSavings,
      doneSavings,
      overdueCount: overdueActions,
      isDone,
      isOpen,
    });
    const compositeHealth = computeCompositeHealth(
      operationalHealth.score,
      governanceHealth.score,
      financialHealth.score,
    );

    const paymentsOverdue = d.payments
      .filter((p: any) => p.status === 'atrasado')
      .reduce((s: number, p: any) => s + (p.valor || 0), 0);
    const paymentsPending = d.payments
      .filter((p: any) => p.status === 'pendente')
      .reduce((s: number, p: any) => s + (p.valor || 0), 0);
    const paymentsPaidMonth = d.payments
      .filter((p: any) => p.status === 'pago' && (p.competencia || '').slice(0, 7) === currentMonth)
      .reduce((s: number, p: any) => s + (p.valor || 0), 0);

    return {
      loading: d.loading,
      operationalMonthlyCost: monthlyOperational,
      operationalAnnual: consolidated.operationalAnnual,
      operationalBreakdown: breakdown,
      operationalCostHint,
      costByCategory,
      financialBase: consolidated.total,
      totalBudget: consolidated.budgetTotal,
      totalSavings,
      doneSavings,
      openActions,
      overdueActions,
      paymentsYearTotal: paymentsYearTotal(d.payments, currentYear),
      paymentsOverdue,
      paymentsPending,
      paymentsPaidMonth,
      operationalHealthScore: operationalHealth.score,
      operationalHealthHint: operationalHealth.hint,
      governanceHealthScore: governanceHealth.score,
      governanceHealthHint: governanceHealth.hint,
      financialHealthScore: financialHealth.score,
      financialHealthHint: financialHealth.hint,
      compositeHealthScore: compositeHealth.score,
      compositeHealthHint: compositeHealth.hint,
      healthColor: healthScoreColor(compositeHealth.score),
      criticalAlerts,
      unreadCriticalAlerts,
      criticalRisks: d.risks.filter((r: any) => normalizeRiskSeverity(r.severity) === 'Crítico').length,
      domainsExpiring,
      expiredDomains,
      unusedLicenses,
      assetsInUse,
    };
  }
}
