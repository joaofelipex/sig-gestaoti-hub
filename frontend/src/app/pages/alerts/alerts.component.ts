import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { DashboardService, Alert } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { KpiCardComponent } from '../../components/charts.component';
import { SigIcons } from '../../core/sig-icons';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Alertas</h1>
          <p class="app-page-sub">Notificações de domínios, licenças, pagamentos e infraestrutura.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" (click)="generate()" [disabled]="generating" class="btn btn-primary btn-sm">
            <i class="fas fa-sync-alt" [class.fa-spin]="generating" aria-hidden="true"></i>
            {{ generating ? 'Atualizando…' : 'Atualizar alertas' }}
          </button>
          <button type="button" (click)="markAllRead()" class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-check-double" aria-hidden="true"></i> Marcar todos como lidos
          </button>
        </div>
      </header>

      <div class="sig-kpi-grid">
        <app-kpi-card label="Não lidos" [value]="unreadCount" [icon]="icons.alert" color="#3b82f6"></app-kpi-card>
        <app-kpi-card label="Críticos" [value]="counts.critico" [icon]="icons.alertCritical" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Avisos" [value]="counts.aviso" [icon]="icons.warning" color="#f59e0b"></app-kpi-card>
        <app-kpi-card label="Informações" [value]="counts.info" [icon]="icons.info" color="#10b981"></app-kpi-card>
      </div>

      <div class="sig-filter-tabs">
        <button type="button" *ngFor="let f of ['todos','critico','aviso','info','nao_lidos']"
                (click)="filter=f"
                [class.is-active]="filter===f">
          {{ filterLabel(f) }}
        </button>
      </div>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="d-flex flex-column gap-2">
        <article *ngFor="let a of filtered" class="sig-alert-item" [class]="borderClass(a.severidade)" [class.is-read]="a.lida">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold text-gray-900">{{ a.titulo }}</h3>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full" [class]="sevClass(a.severidade)">{{ sevLabel(a.severidade) }}</span>
                <span *ngIf="!a.lida" class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">Novo</span>
              </div>
              <p *ngIf="a.mensagem" class="text-sm text-gray-600 mb-1">{{ a.mensagem }}</p>
              <div class="text-xs text-gray-400">{{ a.tipo }} · {{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <a *ngIf="a.link" [href]="a.link" target="_blank" class="sig-icon-btn text-blue-600" title="Abrir">
                <i [class]="icons.external" aria-hidden="true"></i>
              </a>
              <button *ngIf="!a.lida" type="button" (click)="markRead(a)" class="sig-icon-btn sig-icon-btn--success" title="Marcar como lido">
                <i [class]="icons.check" aria-hidden="true"></i>
              </button>
              <button type="button" (click)="remove(a)" class="sig-icon-btn sig-icon-btn--danger" title="Excluir">
                <i [class]="icons.trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
        <div *ngIf="!filtered.length" class="sig-table-empty">Nenhum alerta</div>
      </div>
    </section>
  `
})
export class AlertsComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  alerts: Alert[] = []; loading = true; filter = 'todos'; generating = false;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private api: ApiService, private toast: ToastService) {}
  ngOnInit() {
    this.sub = this.dashboard.data$.subscribe(d => { this.alerts = [...d.alerts].sort((a,b)=> (b.created_at||'').localeCompare(a.created_at||'')); this.loading = d.loading; });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  get filtered() {
    if (this.filter === 'todos') return this.alerts;
    if (this.filter === 'nao_lidos') return this.alerts.filter(a => !a.lida);
    return this.alerts.filter(a => a.severidade === this.filter);
  }
  get counts() { return { critico: this.alerts.filter(a=>a.severidade==='critico').length, aviso: this.alerts.filter(a=>a.severidade==='aviso').length, info: this.alerts.filter(a=>a.severidade==='info').length }; }
  get unreadCount() { return this.alerts.filter(a => !a.lida).length; }

  filterLabel(f: string) { return ({ todos:'Todos', critico:'Críticos', aviso:'Avisos', info:'Info', nao_lidos:'Não lidos' } as any)[f]; }
  sevLabel(s: string) { return ({ critico:'Crítico', aviso:'Aviso', info:'Info' } as any)[s] || s; }
  sevClass(s: string) { return s === 'critico' ? 'bg-red-100 text-red-800' : s === 'aviso' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'; }
  borderClass(s: string) { return s === 'critico' ? 'border-red-500' : s === 'aviso' ? 'border-yellow-500' : 'border-blue-500'; }

  async markRead(a: Alert) {
    await firstValueFrom(this.api.patchTable('alertas', a.id, { lida: true }));
    a.lida = true;
  }
  async markAllRead() {
    const ids = this.alerts.filter((x) => !x.lida).map((x) => x.id);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => firstValueFrom(this.api.patchTable('alertas', id, { lida: true }))));
    this.dashboard.loadData();
  }
  async remove(a: Alert) { await this.crud.remove('alertas', a.id); }

  async generate() {
    this.generating = true;
    try {
      const today = new Date(); const in30 = new Date(Date.now() + 30*86400000); const in15 = new Date(Date.now() + 15*86400000);
      const data = await firstValueFrom(this.dashboard.data$.pipe(take(1)));
      const newAlerts: any[] = [];
      const existingTitles = new Set(this.alerts.map(a => a.titulo));
      const push = (titulo: string, mensagem: string, tipo: string, severidade: string) => {
        if (!existingTitles.has(titulo)) newAlerts.push({ titulo, mensagem, tipo, severidade, lida: false });
      };
      data.domains.forEach((d: any) => {
        if (!d.expirationDate) return;
        const days = Math.ceil((new Date(d.expirationDate).getTime() - today.getTime()) / 86400000);
        if (days <= 0) push(`Domínio expirado: ${d.url}`, `Vencido em ${d.expirationDate}`, 'dominio', 'critico');
        else if (days <= 15) push(`Domínio vence em ${days}d: ${d.url}`, `Vence em ${d.expirationDate}`, 'dominio', 'critico');
        else if (days <= 30) push(`Domínio vence em ${days}d: ${d.url}`, `Vence em ${d.expirationDate}`, 'dominio', 'aviso');
      });
      data.licenses.forEach((l: any) => {
        if (!l.renewalDate) return;
        const days = Math.ceil((new Date(l.renewalDate).getTime() - today.getTime()) / 86400000);
        if (days <= 30 && days > 0) push(`Licença renova em ${days}d: ${l.software}`, `Renovação em ${l.renewalDate}`, 'licenca', days <= 15 ? 'critico' : 'aviso');
      });
      data.servers.forEach((s: any) => {
        if (s.sslExpiration) { const d = Math.ceil((new Date(s.sslExpiration).getTime() - today.getTime()) / 86400000); if (d <= 30 && d > 0) push(`SSL ${s.name} vence em ${d}d`, `SSL em ${s.sslExpiration}`, 'servidor', d <= 15 ? 'critico':'aviso'); }
        if (s.contractEnd) { const d = Math.ceil((new Date(s.contractEnd).getTime() - today.getTime()) / 86400000); if (d <= 30 && d > 0) push(`Contrato ${s.name} vence em ${d}d`, `Contrato em ${s.contractEnd}`, 'servidor', 'aviso'); }
      });
      data.payments.forEach((p: any) => {
        if (p.status === 'pendente' && p.vencimento) { const d = Math.ceil((new Date(p.vencimento).getTime() - today.getTime()) / 86400000); if (d < 0) push(`Pagamento atrasado: ${p.nome}`, `Venceu em ${p.vencimento}`, 'pagamento', 'critico'); else if (d <= 7) push(`Pagamento em ${d}d: ${p.nome}`, `Vence em ${p.vencimento}`, 'pagamento', 'aviso'); }
      });
      if (newAlerts.length) {
        await this.crud.bulkInsert('alertas', newAlerts);
      } else {
        this.toast.show({ title: 'Atualizado', description: 'Nenhum novo alerta encontrado' });
      }
    } finally { this.generating = false; }
  }
}
