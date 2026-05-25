import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { DashboardService, Alert } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { KpiCardComponent } from '../../components/charts.component';
import { ConfirmComponent } from '../../components/modal.component';
import { SigIcons } from '../../core/sig-icons';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, ConfirmComponent],
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
          <button type="button" (click)="markAllRead()" [disabled]="markingAll" class="btn btn-outline-secondary btn-sm">
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
          <div class="sig-alert-item__layout">
            <div class="sig-alert-item__icon" [class]="alertIconClass(a.severidade)">
              <i [class]="alertIcon(a.severidade)" aria-hidden="true"></i>
            </div>
            <div class="sig-alert-item__content">
              <div class="sig-alert-item__head">
                <div>
                  <p class="sig-alert-item__eyebrow">{{ typeLabel(a.tipo) }}</p>
                  <h3 class="sig-alert-item__title">{{ displayTitle(a) }}</h3>
                </div>
                <div class="sig-alert-item__badges">
                  <span class="sig-alert-pill" [class]="sevClass(a.severidade)">{{ sevLabel(a.severidade) }}</span>
                  <span *ngIf="!a.lida" class="sig-alert-pill sig-alert-pill--new">Novo</span>
                </div>
              </div>
              <p *ngIf="a.mensagem" class="sig-alert-item__message">{{ a.mensagem }}</p>
              <div class="sig-alert-item__meta">{{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div class="sig-alert-item__actions">
              <a *ngIf="a.link" [href]="a.link" target="_blank" class="sig-icon-btn text-blue-600" title="Abrir" aria-label="Abrir alerta">
                <i [class]="icons.external" aria-hidden="true"></i>
              </a>
              <button *ngIf="!a.lida" type="button" (click)="markRead(a)" [disabled]="markingId === a.id" class="sig-icon-btn sig-icon-btn--success" title="Marcar como lido" aria-label="Marcar alerta como lido">
                <i [class]="icons.check" aria-hidden="true"></i>
              </button>
              <button type="button" (click)="askRemove(a)" class="sig-icon-btn sig-icon-btn--danger" title="Excluir" aria-label="Excluir alerta">
                <i [class]="icons.trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
        <div *ngIf="!filtered.length" class="sig-table-empty">Nenhum alerta</div>
      </div>
    </section>
    <app-confirm [open]="confirmOpen" title="Excluir alerta" [message]="'Excluir ' + (toDelete ? displayTitle(toDelete) : 'este alerta') + '?'" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="remove()"></app-confirm>
  `
})
export class AlertsComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  alerts: Alert[] = []; loading = true; filter = 'todos'; generating = false; markingAll = false; deleting = false;
  markingId: string | null = null;
  confirmOpen = false;
  toDelete: Alert | null = null;
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
  typeLabel(t: string) { return ({ dominio:'Domínio', licenca:'Licença', servidor:'Servidor', pagamento:'Pagamento', infra:'Infraestrutura' } as any)[t] || t; }
  alertIcon(s: string) { return s === 'critico' ? this.icons.alertCritical : s === 'aviso' ? this.icons.warning : this.icons.info; }
  alertIconClass(s: string) { return s === 'critico' ? 'sig-alert-item__icon--critical' : s === 'aviso' ? 'sig-alert-item__icon--warning' : 'sig-alert-item__icon--info'; }

  async markRead(a: Alert) {
    if (this.markingId) return;
    this.markingId = a.id;
    try {
      await firstValueFrom(this.api.patchTable('alertas', a.id, { lida: true }));
      a.lida = true;
    } finally {
      this.markingId = null;
    }
  }
  async markAllRead() {
    const ids = this.alerts.filter((x) => !x.lida).map((x) => x.id);
    if (!ids.length) return;
    this.markingAll = true;
    try {
      await Promise.all(ids.map((id) => firstValueFrom(this.api.patchTable('alertas', id, { lida: true }))));
      void this.dashboard.loadData(true);
    } finally {
      this.markingAll = false;
    }
  }
  askRemove(a: Alert) { this.toDelete = a; this.confirmOpen = true; }
  async remove() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('alertas', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }

  async generate() {
    this.generating = true;
    try {
      const today = new Date();
      const data = await firstValueFrom(this.dashboard.data$.pipe(take(1)));
      const newAlerts: any[] = [];
      const existingKeys = new Set(this.alerts.map(a => this.alertKey(this.displayTitle(a), a.mensagem, a.tipo)));
      const existingTitles = new Set(this.alerts.map(a => a.titulo));
      const push = (titulo: string, mensagem: string, tipo: string, severidade: string, legacyTitles: string[] = []) => {
        const key = this.alertKey(titulo, mensagem, tipo);
        if (existingKeys.has(key) || legacyTitles.some((legacyTitle) => existingTitles.has(legacyTitle))) return;
        newAlerts.push({ titulo, mensagem, tipo, severidade, lida: false });
        existingKeys.add(key);
      };
      data.domains.forEach((d: any) => {
        if (!d.expirationDate) return;
        const days = Math.ceil((new Date(d.expirationDate).getTime() - today.getTime()) / 86400000);
        if (days <= 0) push('Domínio expirado', `${d.url} venceu em ${d.expirationDate}`, 'dominio', 'critico', [`Domínio expirado: ${d.url}`]);
        else if (days <= 15) push(`Domínio expira em ${days} dias`, `${d.url} vence em ${d.expirationDate}`, 'dominio', 'critico', [`Domínio vence em ${days}d: ${d.url}`]);
        else if (days <= 30) push(`Domínio expira em ${days} dias`, `${d.url} vence em ${d.expirationDate}`, 'dominio', 'aviso', [`Domínio vence em ${days}d: ${d.url}`]);
      });
      data.licenses.forEach((l: any) => {
        if (!l.renewalDate) return;
        const days = Math.ceil((new Date(l.renewalDate).getTime() - today.getTime()) / 86400000);
        if (days <= 30 && days > 0) push(`Licença renova em ${days} dias`, `${l.software} renova em ${l.renewalDate}`, 'licenca', days <= 15 ? 'critico' : 'aviso', [`Licença renova em ${days}d: ${l.software}`]);
      });
      data.servers.forEach((s: any) => {
        if (s.sslExpiration) { const d = Math.ceil((new Date(s.sslExpiration).getTime() - today.getTime()) / 86400000); if (d <= 30 && d > 0) push(`SSL vence em ${d} dias`, `${s.name} vence em ${s.sslExpiration}`, 'servidor', d <= 15 ? 'critico':'aviso', [`SSL ${s.name} vence em ${d}d`]); }
        if (s.contractEnd) { const d = Math.ceil((new Date(s.contractEnd).getTime() - today.getTime()) / 86400000); if (d <= 30 && d > 0) push(`Contrato vence em ${d} dias`, `${s.name} vence em ${s.contractEnd}`, 'servidor', 'aviso', [`Contrato ${s.name} vence em ${d}d`]); }
      });
      data.payments.forEach((p: any) => {
        if (p.status === 'pendente' && p.vencimento) { const d = Math.ceil((new Date(p.vencimento).getTime() - today.getTime()) / 86400000); if (d < 0) push('Pagamento atrasado', `${p.nome} venceu em ${p.vencimento}`, 'pagamento', 'critico', [`Pagamento atrasado: ${p.nome}`]); else if (d <= 7) push(`Pagamento vence em ${d} dias`, `${p.nome} vence em ${p.vencimento}`, 'pagamento', 'aviso', [`Pagamento em ${d}d: ${p.nome}`]); }
      });
      if (newAlerts.length) {
        await this.crud.bulkInsert('alertas', newAlerts);
      } else {
        this.toast.show({ title: 'Atualizado', description: 'Nenhum novo alerta encontrado' });
      }
    } finally { this.generating = false; }
  }

  displayTitle(a: Alert) {
    return this.polishTitle(a.titulo);
  }

  private polishTitle(title: string) {
    return title
      .replace(/^Domínio expirado:.+$/i, 'Domínio expirado')
      .replace(/^Domínio vence em (\d+)d:.+$/i, 'Domínio expira em $1 dias')
      .replace(/^Licença renova em (\d+)d:.+$/i, 'Licença renova em $1 dias')
      .replace(/^SSL .+ vence em (\d+)d$/i, 'SSL vence em $1 dias')
      .replace(/^Contrato .+ vence em (\d+)d$/i, 'Contrato vence em $1 dias')
      .replace(/^Pagamento atrasado:.+$/i, 'Pagamento atrasado')
      .replace(/^Pagamento em (\d+)d:.+$/i, 'Pagamento vence em $1 dias');
  }

  private alertKey(titulo: string, mensagem: string | null, tipo: string) {
    return `${tipo}:${titulo}:${mensagem ?? ''}`;
  }
}
