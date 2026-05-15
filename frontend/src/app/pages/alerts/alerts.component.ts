import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { DashboardService, Alert } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { KpiCardComponent } from '../../components/charts.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Alertas</h1>
        <div class="flex gap-2">
          <button (click)="generate()" [disabled]="generating" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-sm font-medium">
            {{ generating ? 'Atualizando...' : '🔄 Atualizar Alertas' }}
          </button>
          <button (click)="markAllRead()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm">Marcar todos como lidos</button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <app-kpi-card label="Não lidos" [value]="unreadCount" icon="🔔" color="#3b82f6"></app-kpi-card>
        <app-kpi-card label="Críticos" [value]="counts.critico" icon="🚨" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Avisos" [value]="counts.aviso" icon="⚠️" color="#f59e0b"></app-kpi-card>
        <app-kpi-card label="Informações" [value]="counts.info" icon="ℹ️" color="#10b981"></app-kpi-card>
      </div>

      <div class="flex gap-2 border-b border-gray-200">
        <button *ngFor="let f of ['todos','critico','aviso','info','nao_lidos']"
                (click)="filter=f"
                class="px-4 py-2 text-sm font-medium border-b-2"
                [class]="filter===f ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'">
          {{ filterLabel(f) }}
        </button>
      </div>

      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="space-y-2">
        <div *ngFor="let a of filtered" class="bg-white rounded-lg shadow-sm p-4 border-l-4" [class]="borderClass(a.severidade)" [class.opacity-60]="a.lida">
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
              <a *ngIf="a.link" [href]="a.link" target="_blank" class="text-blue-600 hover:underline text-sm">Ver</a>
              <button *ngIf="!a.lida" (click)="markRead(a)" class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">✓</button>
              <button (click)="remove(a)" class="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">×</button>
            </div>
          </div>
        </div>
        <div *ngIf="!filtered.length" class="text-center text-sm text-gray-400 py-8">Nenhum alerta</div>
      </div>
    </div>
  `
})
export class AlertsComponent implements OnInit, OnDestroy {
  alerts: Alert[] = []; loading = true; filter = 'todos'; generating = false;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private supa: SupabaseService, private toast: ToastService) {}
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

  async markRead(a: Alert) { await this.supa.client.from('alertas').update({ lida: true }).eq('id', a.id); a.lida = true; }
  async markAllRead() { const ids = this.alerts.filter(a => !a.lida).map(a => a.id); if (!ids.length) return; await this.supa.client.from('alertas').update({ lida: true }).in('id', ids); this.dashboard.loadData(); }
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
