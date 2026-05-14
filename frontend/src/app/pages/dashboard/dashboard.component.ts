import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent, ChartDatum } from '../../components/charts.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, BarChartComponent, DonutChartComponent, LineChartComponent],
  template: `
    <div class="p-6 space-y-6 bg-gray-50 min-h-full">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-sm text-gray-500">Bem-vindo, {{ user?.email }}</p>
        </div>
        <button (click)="logout()" class="text-sm text-gray-500 hover:text-red-600">Sair</button>
      </div>

      <div *ngIf="loading" class="text-center py-12 text-gray-500">Carregando...</div>

      <ng-container *ngIf="!loading">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <app-kpi-card label="Health Score" [value]="healthScore + '%'" icon="❤️" [color]="healthColor" hint="Saúde geral"></app-kpi-card>
          <app-kpi-card label="Ativos em uso" [value]="assetsInUse" icon="💻" color="#3b82f6"></app-kpi-card>
          <app-kpi-card label="Custo Mensal TI" [value]="brl(monthlyCost)" icon="💰" color="#10b981"></app-kpi-card>
          <app-kpi-card label="Domínios ≤30d" [value]="domainsExpiring" icon="🌐" color="#f59e0b"></app-kpi-card>
          <app-kpi-card label="Licenças ociosas" [value]="unusedLicenses" icon="🔑" color="#8b5cf6" hint="Não usadas"></app-kpi-card>
          <app-kpi-card label="Alertas críticos" [value]="criticalAlerts" icon="🚨" color="#ef4444"></app-kpi-card>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
            <h3 class="font-semibold text-gray-900 mb-4">Custos por Categoria (mensal)</h3>
            <app-bar-chart [data]="costByCategory" prefix="R$ "></app-bar-chart>
          </div>
          <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-4">Status dos Ativos</h3>
            <app-donut-chart [data]="assetStatus"></app-donut-chart>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-4">Pagamentos últimos 6 meses</h3>
            <app-line-chart [data]="paymentTrend"></app-line-chart>
          </div>
          <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-4">Domínios por Status</h3>
            <app-donut-chart [data]="domainStatus"></app-donut-chart>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  get user() { return this.authService.user; }
  data: any = { assets: [], domains: [], licenses: [], servers: [], alerts: [], payments: [], loading: true };
  loading = true;
  healthScore = 0; assetsInUse = 0; domainsExpiring = 0; unusedLicenses = 0; monthlyCost = 0; criticalAlerts = 0;
  costByCategory: ChartDatum[] = []; assetStatus: ChartDatum[] = []; paymentTrend: ChartDatum[] = []; domainStatus: ChartDatum[] = [];
  private sub!: Subscription;

  constructor(private authService: AuthService, private dashboardService: DashboardService) {}
  ngOnInit() { this.sub = this.dashboardService.data$.subscribe(d => { this.data = d; this.loading = d.loading; if (!d.loading) this.compute(); }); }
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
