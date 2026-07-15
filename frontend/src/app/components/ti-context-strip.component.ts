import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { TiMetricsService, TiMetrics } from '../services/ti-metrics.service';
import { formatBrl } from '../utils/financial.util';
import { healthScoreColor } from '../utils/health.util';

/** Visão integrada de TI — exibida apenas no Painel geral. */
@Component({
  selector: 'app-ti-context-strip',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside *ngIf="m && !m.loading" class="sig-ti-context" [attr.aria-label]="'Visão integrada de TI'">
      <div class="sig-ti-context__score">
        <p class="sig-ti-context__score-label">Índice TI unificado</p>
        <p class="sig-ti-context__score-value" [style.color]="healthScoreColor(m.compositeHealthScore)">
          {{ m.compositeHealthScore }}%
        </p>
        <p class="sig-ti-context__score-hint">{{ m.compositeHealthHint }}</p>
      </div>

      <div class="sig-ti-context__axes">
        <div class="sig-ti-context__axis">
          <span class="sig-ti-context__axis-label">Operacional</span>
          <span class="sig-ti-context__axis-value" [style.color]="healthScoreColor(m.operationalHealthScore)">
            {{ m.operationalHealthScore }}%
          </span>
        </div>
        <div class="sig-ti-context__axis">
          <span class="sig-ti-context__axis-label">Governança</span>
          <span class="sig-ti-context__axis-value" [style.color]="healthScoreColor(m.governanceHealthScore)">
            {{ m.governanceHealthScore }}%
          </span>
        </div>
        <div class="sig-ti-context__axis">
          <span class="sig-ti-context__axis-label">Financeiro</span>
          <span class="sig-ti-context__axis-value" [style.color]="healthScoreColor(m.financialHealthScore)">
            {{ m.financialHealthScore }}%
          </span>
        </div>
      </div>

      <div class="sig-ti-context__metrics">
        <span><i class="fas fa-coins me-1" aria-hidden="true"></i>{{ formatBrl(m.operationalMonthlyCost) }}/mês</span>
        <span *ngIf="m.unreadCriticalAlerts || m.criticalAlerts">
          <i class="fas fa-bell me-1" aria-hidden="true"></i>
          <ng-container *ngIf="m.unreadCriticalAlerts; else allCritical">
            {{ m.unreadCriticalAlerts }} crítico(s) não lido(s)
          </ng-container>
          <ng-template #allCritical>{{ m.criticalAlerts }} crítico(s)</ng-template>
        </span>
        <span *ngIf="m.criticalRisks"><i class="fas fa-shield-alt me-1" aria-hidden="true"></i>{{ m.criticalRisks }} risco(s)</span>
        <span *ngIf="m.paymentsOverdue"><i class="fas fa-exclamation-circle me-1" aria-hidden="true"></i>{{ formatBrl(m.paymentsOverdue) }} atrasado</span>
      </div>

      <nav class="sig-ti-context__nav" aria-label="Módulos relacionados">
        <a routerLink="/dashboard" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: false }">Painel</a>
        <a routerLink="/economista" routerLinkActive="is-active">Economista</a>
        <a routerLink="/pagamentos" routerLinkActive="is-active">Pagamentos</a>
        <a routerLink="/governanca" routerLinkActive="is-active">Governança</a>
        <a routerLink="/alertas" routerLinkActive="is-active">Alertas</a>
      </nav>
    </aside>
  `,
})
export class TiContextStripComponent implements OnInit, OnDestroy {
  m: TiMetrics | null = null;
  readonly formatBrl = formatBrl;
  readonly healthScoreColor = healthScoreColor;
  private sub?: Subscription;

  constructor(private tiMetrics: TiMetricsService) {}

  ngOnInit() {
    this.sub = this.tiMetrics.metrics$.subscribe((m) => (this.m = m));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
