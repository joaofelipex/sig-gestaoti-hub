import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Maintenance, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { DateInputComponent } from '../../components/date-input.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigBadge } from '../../utils/status-badge';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, DateInputComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Manutenção</h1>
          <p class="app-page-sub">Ordens de serviço e histórico de manutenção.</p>
        </div>
      </header>
      <app-data-toolbar searchPlaceholder="Buscar tipo, fornecedor..." [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'aberta',label:'Aberta'},{value:'em_andamento',label:'Em andamento'},{value:'concluida',label:'Concluída'},{value:'cancelada',label:'Cancelada'}]}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Ativo</th><th>Tipo</th><th>Status</th><th>Abertura</th><th>Conclusão</th><th>Fornecedor</th><th>Custo</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let m of filtered">
              <td class="fw-medium">{{ assetLabel(m.ativo_id) }}</td>
              <td>{{ m.tipo }}</td>
              <td><span [class]="statusClass(m.status)">{{ statusLabel(m.status) }}</span></td>
              <td>{{ m.data_abertura | date:'dd/MM/yyyy' }}</td>
              <td>{{ m.data_conclusao ? (m.data_conclusao | date:'dd/MM/yyyy') : '—' }}</td>
              <td>{{ m.fornecedor || '—' }}</td>
              <td>{{ m.custo ? 'R$ ' + m.custo.toLocaleString('pt-BR') : '—' }}</td>
              <td class="text-end">
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(m)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(m)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="8" class="sig-table-empty">Nenhuma manutenção</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Manutenção' : 'Nova Manutenção'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="md:col-span-2 text-sm">Ativo *
          <select [(ngModel)]="form.ativo_id" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Selecione...</option>
            <option *ngFor="let a of assets" [value]="a.id">{{ a.type }} {{ a.brand }} {{ a.model }} ({{ a.serialNumber || a.id.slice(0,8) }})</option>
          </select>
        </label>
        <label class="text-sm">Tipo *<select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Preventiva</option><option>Corretiva</option><option>Atualização</option></select></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></label>
        <label class="text-sm">Abertura<app-date-input [(ngModel)]="form.data_abertura" ariaLabel="Abertura"></app-date-input></label>
        <label class="text-sm">Conclusão<app-date-input [(ngModel)]="form.data_conclusao" ariaLabel="Conclusão"></app-date-input></label>
        <label class="text-sm">Fornecedor<input [(ngModel)]="form.fornecedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Custo (R$)<input type="number" step="0.01" [(ngModel)]="form.custo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Descrição<textarea [(ngModel)]="form.descricao" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir manutenção" [message]="'Excluir manutenção de ' + (toDelete ? assetLabel(toDelete.ativo_id) : '?') + '?'" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  maintenance: Maintenance[] = []; assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: Maintenance | null = null;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.maintenance = d.maintenance; this.assets = d.assets; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.maintenance.filter(m =>
      (!q || m.tipo?.toLowerCase().includes(q) || m.fornecedor?.toLowerCase().includes(q) || m.descricao?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || m.status === this.filterValues['status'])
    );
  }
  assetLabel(id: string) { const a = this.assets.find(x => x.id === id); return a ? `${a.brand} ${a.model}` : id?.slice(0, 8) || '—'; }
  statusLabel(s: string) {
    return s === 'em_andamento' ? 'Em andamento' : s === 'concluida' ? 'Concluída' : s === 'cancelada' ? 'Cancelada' : 'Aberta';
  }
  statusClass(s: string) {
    return s === 'concluida' ? SigBadge.success : s === 'em_andamento' ? SigBadge.info : s === 'aberta' ? SigBadge.warning : SigBadge.neutral;
  }
  openNew() { this.form = { tipo: 'Preventiva', status: 'aberta', data_abertura: new Date().toISOString().slice(0,10) }; this.modalOpen = true; }
  openEdit(m: Maintenance) { this.form = { ...m }; this.modalOpen = true; }
  async save() { if (!this.ux.requireAll([[this.form.ativo_id, 'o ativo'], [this.form.tipo, 'o tipo da manutenção']])) return; this.saving = true; try { const o = { ...this.form }; if (!o.data_conclusao) o.data_conclusao = null; if (!o.custo) o.custo = null; const ok = await this.crud.upsert('manutencoes', o); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(m: Maintenance) { this.toDelete = m; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('manutencoes', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(m => ({ Ativo: this.assetLabel(m.ativo_id), Tipo: m.tipo, Status: m.status, Abertura: m.data_abertura, Conclusao: m.data_conclusao, Fornecedor: m.fornecedor, Custo: m.custo, Descricao: m.descricao })), 'manutencoes'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ ativo_id: r['ativo_id'], tipo: r['Tipo']||'Preventiva', status: r['Status']||'aberta', data_abertura: r['Abertura']||new Date().toISOString().slice(0,10), data_conclusao: r['Conclusao']||null, fornecedor: r['Fornecedor']||null, custo: Number(r['Custo']||0)||null, descricao: r['Descricao']||null })).filter(r => r.ativo_id);
    if (payload.length) await this.crud.bulkInsert('manutencoes', payload);
    else this.ux.noImportRows('manutenções');
  }
}
