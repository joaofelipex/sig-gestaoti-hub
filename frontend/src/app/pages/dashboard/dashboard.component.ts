import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent, ChartDatum } from '../../components/charts.component';
import { SigIcons } from '../../core/sig-icons';
import { ApiService } from '../../services/api.service';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent],
  template: `
    <section class="sig-page">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Dashboard</h1>
          <p class="app-page-sub">Bem-vindo, <span class="font-medium text-gray-700">{{ user?.email }}</span></p>
        </div>
        <button type="button" (click)="logout()" class="btn btn-outline-danger btn-sm">
          <i class="fas fa-sign-out-alt me-1" aria-hidden="true"></i> Sair
        </button>
      </div>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>

      <ng-container *ngIf="!loading">
        <div
          *ngIf="isEmpty"
          class="sig-notice-panel"
          role="status"
        >
          <p class="sig-notice-panel__title">
            <i class="fas fa-database me-2" aria-hidden="true"></i>
            Sem registos para a sua organização
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
            <li *ngIf="empresaFilterActive">No header, escolha <strong>Todas as empresas</strong> — o filtro pode ocultar registos.</li>
            <li *ngIf="wrongOrgHint">{{ wrongOrgHint }}</li>
            <li *ngIf="!wrongOrgHint && orgAtivos === 0">Crie registos no menu ou importe CSV nas listagens.</li>
            <li *ngIf="orgAtivos && orgAtivos > 0">Há dados na sua org; confirme o filtro de empresa no header.</li>
          </ul>
        </div>

        <div class="sig-kpi-grid sig-kpi-grid--6">
          <app-kpi-card label="Health Score" [value]="healthScore + '%'" [icon]="icons.health" [color]="healthColor" hint="Saúde geral"></app-kpi-card>
          <app-kpi-card label="Ativos em uso" [value]="assetsInUse" [icon]="icons.assets" color="#3b82f6"></app-kpi-card>
          <app-kpi-card label="Custo Mensal TI" [value]="brl(monthlyCost)" [icon]="icons.cost" color="#10b981"></app-kpi-card>
          <app-kpi-card label="Domínios ≤30d" [value]="domainsExpiring" [icon]="icons.domain" color="#f59e0b"></app-kpi-card>
          <app-kpi-card label="Licenças ociosas" [value]="unusedLicenses" [icon]="icons.license" color="#8b5cf6" hint="Não usadas"></app-kpi-card>
          <app-kpi-card label="Alertas críticos" [value]="criticalAlerts" [icon]="icons.alertCritical" color="#ef4444"></app-kpi-card>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div class="app-card lg:col-span-2">
            <h3 class="sig-chart-title">Custos por categoria (mensal)</h3>
            <app-bar-chart [data]="costByCategory" prefix="R$ "></app-bar-chart>
          </div>
          <div class="app-card">
            <h3 class="sig-chart-title">Status dos ativos</h3>
            <app-donut-chart [data]="assetStatus"></app-donut-chart>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="app-card">
            <h3 class="sig-chart-title">Pagamentos últimos 6 meses</h3>
            <app-line-chart [data]="paymentTrend"></app-line-chart>
          </div>
          <div class="app-card">
            <h3 class="sig-chart-title">Domínios por status</h3>
            <app-donut-chart [data]="domainStatus"></app-donut-chart>
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
  loading = true;
  healthScore = 0; assetsInUse = 0; domainsExpiring = 0; unusedLicenses = 0; monthlyCost = 0; criticalAlerts = 0;
  costByCategory: ChartDatum[] = []; assetStatus: ChartDatum[] = []; paymentTrend: ChartDatum[] = []; domainStatus: ChartDatum[] = [];
  private sub!: Subscription;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private api: ApiService,
    private empresaService: EmpresaService,
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
        this.wrongOrgHint =
          me.dataScope === 'org' &&
          me.dataCounts?.ativos === 0 &&
          (me.databaseSummary?.totalAtivos ?? 0) > 0
            ? `Modo org ativo: os dados na base não estão na sua organização. Em backend/.env use DATA_SCOPE=all e reinicie a API.`
            : '';
      },
      error: () => {},
    });
    void this.dashboardService.loadData(true);
    this.sub = this.dashboardService.data$.subscribe((d) => {
      this.data = d;
      this.loading = d.loading;
      if (!d.loading) this.compute();
    });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  brl(v: number) { return 'R$ ' + (v||0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
  get healthColor() { return this.healthScore >= 80 ? '#10b981' : this.healthScore >= 50 ? '#f59e0b' : '#ef4444'; }

  private compute() {
    const { assets, domains, licenses, servers, alerts, payments } = this.data;
    const days = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 999;

    this.assetsInUse = assets.filter((a: any) => a.status === 'Em uso').length;
    this.domainsExpiring = domains.filter((d: any) => d.expirationDate && days(d.expirationDate) > 0 && days(d.expirationDate) <= 30).length;
    this.unusedLicenses = licenses.reduce((s: number, l: any) => s + Math.max(0, l.totalLicenses - l.usedLicenses), 0);
    this.criticalAlerts = alerts.filter((a: any) => a.severidade === 'critico' && !a.lida).length;

    const serverCost = servers.reduce((s: number, x: any) => s + (x.monthlyCost||0), 0);
    const licCost = licenses.reduce((s: number, l: any) => s + (l.costPerUnit||0) * (l.type === 'Mensal' ? (l.usedLicenses||0) : (l.usedLicenses||0)/12), 0);
    const domCost = domains.reduce((s: number, d: any) => s + (d.renewalCost||0)/12, 0);
    this.monthlyCost = Math.round(serverCost + licCost + domCost);

    this.costByCategory = [
      { label: 'Servidores', value: Math.round(serverCost) },
      { label: 'Licenças', value: Math.round(licCost) },
      { label: 'Domínios', value: Math.round(domCost) },
    ];

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

    let score = 100;
    score -= this.criticalAlerts * 8;
    score -= domains.filter((d: any) => d.status === 'Expirado').length * 15;
    score -= this.domainsExpiring * 4;
    score -= assets.filter((a: any) => a.status === 'Em uso' && !a.assignedTo).length * 2;
    this.healthScore = Math.max(0, Math.min(100, score));
  }

  async logout() { await this.authService.signOut(); }
}
