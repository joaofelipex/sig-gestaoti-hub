import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent, ChartDatum } from '../../components/charts.component';
import { SigIcons } from '../../core/sig-icons';
import { ApiService } from '../../services/api.service';
import { EmpresaService } from '../../services/empresa.service';
import { TiMetricsService, TiMetrics } from '../../services/ti-metrics.service';
import { TiContextStripComponent } from '../../components/ti-context-strip.component';
import { formatBrl } from '../../utils/financial.util';
import { healthScoreColor } from '../../utils/health.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent, TiContextStripComponent],
  template: `
    <section class="sig-page">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Painel</h1>
          <p class="app-page-sub">
            Bem-vindo, <span class="font-medium text-gray-700">{{ user?.email }}</span>
            · visão operacional integrada ao Economista e Pagamentos
          </p>
        </div>
        <button type="button" (click)="logout()" class="btn btn-outline-danger btn-sm">
          <i class="fas fa-sign-out-alt me-1" aria-hidden="true"></i> Sair
        </button>
      </div>

      <app-ti-context-strip highlight="dashboard"></app-ti-context-strip>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>

      <ng-container *ngIf="!loading">
        <div
          *ngIf="isEmpty"
          class="sig-notice-panel"
          role="status"
        >
          <p class="sig-notice-panel__title">
            <i class="fas fa-database me-2" aria-hidden="true"></i>
            Sem registros para a sua organização
          </p>
          <p class="mb-2" *ngIf="orgNome">
            Organização da sua conta: <strong>{{ orgNome }}</strong>
            <span *ngIf="orgAtivos !== null"> · {{ orgAtivos }} ativo(s) nesta organização</span>.
          </p>
          <p class="mb-2" *ngIf="wrongOrgHint">
            {{ wrongOrgHint }}
          </p>
          <p class="mb-2" *ngIf="!wrongOrgHint && postgresLabel">
            PostgreSQL · <strong>{{ postgresLabel }}</strong>
          </p>
          <ul>
            <li *ngIf="empresaFilterActive">No topo da página, escolha <strong>Todas as empresas</strong> — o filtro pode ocultar registros.</li>
            <li *ngIf="wrongOrgHint">{{ wrongOrgHint }}</li>
            <li *ngIf="!wrongOrgHint && orgAtivos === 0">Crie registros no menu ou importe CSV nas listagens.</li>
            <li *ngIf="orgAtivos && orgAtivos > 0">Há dados na sua organização; confirme o filtro de empresa no topo.</li>
          </ul>
        </div>

        <div class="sig-kpi-grid sig-kpi-grid--6">
          <app-kpi-card label="Saúde operacional" [value]="healthScore + '%'" [icon]="icons.health" [color]="healthColor" [hint]="healthHint"></app-kpi-card>
          <app-kpi-card label="Ativos em uso" [value]="assetsInUse" [icon]="icons.assets" color="#3b82f6" [hint]="assetsHint"></app-kpi-card>
          <app-kpi-card label="Custo Mensal TI" [value]="brl(monthlyCost)" [icon]="icons.cost" color="#10b981" [hint]="costHint"></app-kpi-card>
          <app-kpi-card label="Domínios ≤30d" [value]="domainsExpiring" [icon]="icons.domain" color="#f59e0b" [hint]="domainsHint"></app-kpi-card>
          <app-kpi-card label="Licenças ociosas" [value]="unusedLicenses" [icon]="icons.license" color="#8b5cf6" [hint]="licensesHint"></app-kpi-card>
          <app-kpi-card label="Alertas críticos" [value]="criticalAlerts" [icon]="icons.alertCritical" color="#ef4444" [hint]="alertsHint"></app-kpi-card>
        </div>

        <div *ngIf="!isEmpty" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div class="sig-chart-panel lg:col-span-2">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Custos por categoria</h3>
              <span class="sig-chart-panel__meta">Estimativa mensal · {{ brl(monthlyCost) }} total</span>
            </div>
            <app-bar-chart [data]="costByCategory" prefix="R$ "></app-bar-chart>
          </div>
          <div class="sig-chart-panel">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Status dos ativos</h3>
              <span class="sig-chart-panel__meta">{{ data.assets.length }} cadastrado(s)</span>
            </div>
            <app-donut-chart [data]="assetStatus" centerLabel="Ativos"></app-donut-chart>
          </div>
        </div>

        <div *ngIf="!isEmpty" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="sig-chart-panel">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Pagamentos</h3>
              <span class="sig-chart-panel__meta">Últimos 6 meses · {{ brl(paymentTrendTotal) }}</span>
            </div>
            <app-line-chart [data]="paymentTrend" prefix="R$ "></app-line-chart>
          </div>
          <div class="sig-chart-panel">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Domínios por status</h3>
              <span class="sig-chart-panel__meta">{{ data.domains.length }} domínio(s)</span>
            </div>
            <app-donut-chart [data]="domainStatus" centerLabel="Domínios"></app-donut-chart>
          </div>
        </div>

        <div *ngIf="!isEmpty && (alertsBySeverity.length || licenseUtilization.length)" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="sig-chart-panel" *ngIf="alertsBySeverity.length">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Alertas por severidade</h3>
              <span class="sig-chart-panel__meta">{{ unreadAlerts }} não lido(s) · {{ data.alerts.length }} no total</span>
            </div>
            <app-donut-chart [data]="alertsBySeverity" centerLabel="Alertas"></app-donut-chart>
          </div>
          <div class="sig-chart-panel" *ngIf="licenseUtilization.length">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Utilização de licenças</h3>
              <span class="sig-chart-panel__meta">{{ licenseUsagePct }}% em uso</span>
            </div>
            <app-donut-chart [data]="licenseUtilization" centerLabel="Licenças" [centerValue]="licenseUsagePct + '%'"></app-donut-chart>
          </div>
        </div>
      </ng-container>
    </section>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  postgresLabel = '';
  orgNome = '';
  orgAtivos: number | null = null;
  wrongOrgHint = '';
  empresaFilterActive = false;
  get user() { return this.authService.user; }
  get isEmpty(): boolean {
    const d = this.data;
    return (
      !d.loading &&
      !d.assets?.length &&
      !d.domains?.length &&
      !d.licenses?.length &&
      !d.servers?.length &&
      !d.alerts?.length &&
      !d.payments?.length
    );
  }
  data: any = { assets: [], domains: [], licenses: [], servers: [], alerts: [], payments: [], loading: true };
  ti: TiMetrics | null = null;
  loading = true;
  healthScore = 0; healthHint = 'Saúde geral da TI'; assetsInUse = 0; domainsExpiring = 0; unusedLicenses = 0; monthlyCost = 0; criticalAlerts = 0;
  assetsHint = 'Ativos cadastrados';
  costHint = 'Servidores, licenças e domínios';
  domainsHint = 'Vencimentos próximos';
  licensesHint = 'Assentos não utilizados';
  alertsHint = 'Críticos não lidos';
  costByCategory: ChartDatum[] = [];
  assetStatus: ChartDatum[] = [];
  paymentTrend: ChartDatum[] = [];
  domainStatus: ChartDatum[] = [];
  alertsBySeverity: ChartDatum[] = [];
  licenseUtilization: ChartDatum[] = [];
  paymentTrendTotal = 0;
  licenseUsagePct = 0;
  unreadAlerts = 0;
  private sub!: Subscription;
  private metricsSub!: Subscription;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private api: ApiService,
    private empresaService: EmpresaService,
    private tiMetrics: TiMetricsService,
  ) {}
  ngOnInit() {
    this.empresaFilterActive = !!this.empresaService.selectedId;
    this.api.getHealth().subscribe({
      next: (h) => {
        if (h.ok && h.postgres) {
          this.postgresLabel = `${h.postgres.host}:${h.postgres.port}/${h.postgres.database}`;
        } else if (h.configured) {
          this.postgresLabel = h.configured;
        }
      },
      error: () => {},
    });
    this.api.me().subscribe({
      next: (me) => {
        if (me.postgres?.configured && !this.postgresLabel) {
          this.postgresLabel = me.postgres.configured;
        }
        this.orgNome = me.profile.org_nome || '';
        if (me.dataCounts) {
          this.orgAtivos = me.dataCounts.ativos;
        }
        this.wrongOrgHint = '';
      },
      error: () => {},
    });
    void this.dashboardService.loadData(true);
    this.metricsSub = this.tiMetrics.metrics$.subscribe((m) => {
      this.ti = m;
      if (!m.loading) {
        this.healthScore = m.operationalHealthScore;
        this.healthHint = m.operationalHealthHint.replace(/^Operacional · /, '');
        this.monthlyCost = m.operationalMonthlyCost;
        this.costHint = m.operationalCostHint;
        this.costByCategory = m.costByCategory;
        this.criticalAlerts = m.criticalAlerts;
        this.domainsExpiring = m.domainsExpiring;
        this.unusedLicenses = m.unusedLicenses;
        this.assetsInUse = m.assetsInUse;
        this.assetsHint = `${m.assetsInUse} ativo(s) em uso`;
        this.alertsHint = `${m.criticalAlerts} crítico(s) · integrado aos Alertas`;
      }
    });
    this.sub = this.dashboardService.data$.subscribe((d) => {
      this.data = d;
      this.loading = d.loading;
      if (!d.loading) this.compute();
    });
  }
  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.metricsSub?.unsubscribe();
  }

  brl(v: number) { return formatBrl(v); }
  get healthColor() { return healthScoreColor(this.healthScore); }

  private compute() {
    const { assets, domains, licenses, servers, alerts, payments } = this.data;
    const days = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 999;

    this.assetsInUse = assets.filter((a: any) => a.status === 'Em uso').length;
    this.domainsExpiring = domains.filter((d: any) => d.expirationDate && days(d.expirationDate) > 0 && days(d.expirationDate) <= 30).length;
    this.unusedLicenses = licenses.reduce((s: number, l: any) => s + Math.max(0, l.totalLicenses - l.usedLicenses), 0);

    this.updateKpiHints({ assets, domains, licenses, alerts, days });

    const statusMap: any = {}; assets.forEach((a: any) => statusMap[a.status] = (statusMap[a.status]||0)+1);
    const statusColors: any = { 'Em uso':'#10b981','Estoque':'#3b82f6','Manutenção':'#f59e0b','Aposentado':'#9ca3af' };
    this.assetStatus = Object.entries(statusMap).map(([k,v]:any) => ({ label: k, value: v as number, color: statusColors[k] }));

    const domainMap: any = {}; domains.forEach((d: any) => domainMap[d.status] = (domainMap[d.status]||0)+1);
    const domColors: any = { Ativo:'#10b981', Expirando:'#f59e0b', Expirado:'#ef4444' };
    this.domainStatus = Object.entries(domainMap).map(([k,v]:any) => ({ label: k, value: v as number, color: domColors[k] }));

    const months: ChartDatum[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(); dt.setMonth(dt.getMonth() - i); const ym = dt.toISOString().slice(0,7);
      const total = payments.filter((p: any) => (p.competencia||'').slice(0,7) === ym).reduce((s: number, p: any) => s + (p.valor||0), 0);
      months.push({ label: dt.toLocaleDateString('pt-BR', { month: 'short' }), value: Math.round(total) });
    }
    this.paymentTrend = months;
    this.paymentTrendTotal = months.reduce((s, m) => s + m.value, 0);

    const severityLabels: Record<string, string> = {
      critico: 'Crítico',
      alto: 'Alto',
      medio: 'Médio',
      baixo: 'Baixo',
    };
    const severityColors: Record<string, string> = {
      critico: '#ef4444',
      alto: '#f59e0b',
      medio: '#3b82f6',
      baixo: '#94a3b8',
    };
    const alertMap: Record<string, number> = {};
    alerts.forEach((a: any) => {
      const k = a.severidade || 'baixo';
      alertMap[k] = (alertMap[k] || 0) + 1;
    });
    this.alertsBySeverity = Object.entries(alertMap).map(([k, v]) => ({
      label: severityLabels[k] || k,
      value: v as number,
      color: severityColors[k] || '#6b7280',
    }));
    this.unreadAlerts = alerts.filter((a: any) => !a.lida).length;

    const licUsed = licenses.reduce((s: number, l: any) => s + (l.usedLicenses || 0), 0);
    const licTotal = licenses.reduce((s: number, l: any) => s + (l.totalLicenses || 0), 0);
    const licIdle = Math.max(0, licTotal - licUsed);
    this.licenseUsagePct = licTotal ? Math.round((licUsed / licTotal) * 100) : 0;
    this.licenseUtilization =
      licTotal > 0
        ? [
            { label: 'Em uso', value: licUsed, color: '#10b981' },
            { label: 'Ociosas', value: licIdle, color: '#c4b5fd' },
          ].filter((d) => d.value > 0)
        : [];
  }

  async logout() { await this.authService.signOut(); }

  private updateKpiHints(ctx: {
    assets: any[];
    domains: any[];
    licenses: any[];
    alerts: any[];
    days: (date: string) => number;
  }) {
    const retiredAssets = ctx.assets.filter((a: any) => a.status === 'Aposentado').length;
    const expiredDomains = ctx.domains.filter((d: any) => d.expirationDate && ctx.days(d.expirationDate) <= 0).length;
    const licTotal = ctx.licenses.reduce((s: number, l: any) => s + (l.totalLicenses || 0), 0);

    if (retiredAssets) {
      this.assetsHint = `${this.assetsInUse} de ${ctx.assets.length} ativo(s) em uso · ${retiredAssets} aposentado(s)`;
    }
    this.domainsHint = expiredDomains
      ? `${expiredDomains} expirado(s) · ${this.domainsExpiring} vencem em até 30d`
      : `${this.domainsExpiring} vencem em até 30d`;
    this.licensesHint = licTotal
      ? `${this.unusedLicenses} de ${licTotal} assento(s) sem uso`
      : 'Nenhuma licença cadastrada';
    this.costHint = this.ti?.operationalCostHint || this.costHint;
  }
}
