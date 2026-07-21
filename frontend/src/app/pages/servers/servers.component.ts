import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Server } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { DateInputComponent } from '../../components/date-input.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigBadge } from '../../utils/status-badge';

@Component({
  selector: 'app-servers',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, DateInputComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Servidores</h1>
          <p class="app-page-sub">Infraestrutura, ambientes e capacidade.</p>
        </div>
      </header>
      <app-data-toolbar searchPlaceholder="Buscar nome, provedor..." [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'Online',label:'Online'},{value:'Offline',label:'Offline'},{value:'Manutenção',label:'Manutenção'}]}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Nome</th><th>Provedor</th><th>Tipo</th><th>Status</th><th>Uptime</th><th>Custo Mensal</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let s of filtered">
              <td class="fw-medium">{{ s.name }}</td>
              <td>{{ s.provider }}</td>
              <td>{{ s.type }}</td>
              <td><span [class]="statusClass(s.status)">{{ s.status }}</span></td>
              <td>{{ s.uptime }}%</td>
              <td>R$ {{ s.monthlyCost.toLocaleString('pt-BR') }}</td>
              <td class="text-end">
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(s)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(s)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhum servidor</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Servidor' : 'Novo Servidor'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="md:col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Provedor<input [(ngModel)]="form.provedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Tipo<input [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="VPS, Dedicado, Cloud..."/></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Online</option><option>Offline</option><option>Manutenção</option></select></label>
        <label class="text-sm">Ambiente<select [(ngModel)]="form.ambiente" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="producao">Produção</option><option value="staging">Staging</option><option value="desenvolvimento">Desenvolvimento</option></select></label>
        <label class="text-sm">IP Público<input [(ngModel)]="form.ip_publico" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Região<input [(ngModel)]="form.regiao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">SO<input [(ngModel)]="form.sistema_operacional" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">CPU<input [(ngModel)]="form.cpu" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">RAM<input [(ngModel)]="form.ram" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Armazenamento<input [(ngModel)]="form.armazenamento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Uptime %<input type="number" step="0.1" [(ngModel)]="form.uptime_pct" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Custo Mensal (R$)<input type="number" step="0.01" [(ngModel)]="form.custo_mensal" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">SSL Vencimento<app-date-input [(ngModel)]="form.ssl_vencimento" ariaLabel="SSL Vencimento"></app-date-input></label>
        <label class="text-sm">Contrato fim<app-date-input [(ngModel)]="form.contrato_fim" ariaLabel="Contrato fim"></app-date-input></label>
        <label class="md:col-span-2 text-sm">Finalidade<input [(ngModel)]="form.finalidade" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir servidor" [message]="'Excluir ' + (toDelete?.name || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class ServersComponent implements OnInit, OnDestroy {
  servers: Server[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: Server | null = null;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.servers = d.servers; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.servers.filter(s =>
      (!q || s.name?.toLowerCase().includes(q) || s.provider?.toLowerCase().includes(q) || s.ip?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || s.status === this.filterValues['status'])
    );
  }
  statusClass(s: string) {
    return s === 'Online' ? SigBadge.success : s === 'Offline' ? SigBadge.danger : SigBadge.warning;
  }
  openNew() { this.form = { status: 'Online', ambiente: 'producao', uptime_pct: 99.9, custo_mensal: 0 }; this.modalOpen = true; }
  openEdit(s: Server) {
    this.form = {
      id: s.id,
      empresa_id: (s as any).empresa_id ?? null,
      nome: s.name,
      provedor: s.provider,
      tipo: s.type,
      status: s.status,
      ambiente: s.ambiente || 'producao',
      ip_publico: s.ip,
      regiao: s.region,
      sistema_operacional: s.os,
      cpu: s.cpu,
      ram: s.ram,
      armazenamento: s.storage,
      uptime_pct: s.uptime,
      custo_mensal: s.monthlyCost,
      ssl_vencimento: s.sslExpiration,
      contrato_fim: s.contractEnd,
      finalidade: s.purpose,
      observacoes: s.notes || '',
    };
    this.modalOpen = true;
  }
  async save() { if (!this.ux.require(this.form.nome, 'o nome do servidor')) return; this.saving = true; try { const o = { ...this.form }; ['ssl_vencimento','contrato_fim'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('servidores', o); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(s: Server) { this.toDelete = s; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('servidores', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(s => ({ Nome: s.name, Provedor: s.provider, Tipo: s.type, Status: s.status, IP: s.ip, Uptime: s.uptime, CustoMensal: s.monthlyCost })), 'servidores'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Nome'], provedor: r['Provedor']||null, tipo: r['Tipo']||null, status: r['Status']||'Online', ip_publico: r['IP']||null, uptime_pct: Number(r['Uptime']||100), custo_mensal: Number(r['CustoMensal']||0) })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('servidores', payload);
    else this.ux.noImportRows('servidores');
  }
}
