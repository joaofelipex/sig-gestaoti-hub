import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Movement, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Movimentações</h1>
          <p class="app-page-sub">Entradas, saídas e transferências de ativos.</p>
        </div>
      </header>
      <app-data-toolbar searchPlaceholder="Buscar ativo, responsável..." [search]="search"
        [filters]="[{key:'tipo',label:'Tipo',options:tipoOpts}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Ativo</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>De</th>
            <th>Para</th>
            <th>Responsável</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let m of filtered">
              <td class="fw-medium">{{ m.ativo_label || assetLabel(m.ativo_id) }}</td>
              <td>{{ m.tipo }}</td>
              <td>{{ m.data | date:'dd/MM/yyyy' }}</td>
              <td>{{ m.from_user || m.from_department || '—' }}</td>
              <td>{{ m.to_user || m.to_department || m.recipient || '—' }}</td>
              <td>{{ m.responsible || '—' }}</td>
              <td class="text-end">
                <button type="button" (click)="openEdit(m)" class="sig-link-action me-3">Editar</button>
                <button type="button" (click)="askDelete(m)" class="sig-link-action sig-link-action--danger">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhuma movimentação</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Movimentação' : 'Nova Movimentação'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="md:col-span-2 text-sm">Ativo *
          <select [(ngModel)]="form.ativo_id" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Selecione...</option>
            <option *ngFor="let a of assets" [value]="a.id">{{ a.type }} {{ a.brand }} {{ a.model }}</option>
          </select>
        </label>
        <label class="text-sm">Tipo *<select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Entrega</option><option>Devolução</option><option>Transferência</option><option>Descarte</option><option>Empréstimo</option></select></label>
        <label class="text-sm">Data<input type="date" [(ngModel)]="form.data" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">De (usuário)<input [(ngModel)]="form.from_user" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">De (depto)<input [(ngModel)]="form.from_department" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Para (usuário)<input [(ngModel)]="form.to_user" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Para (depto)<input [(ngModel)]="form.to_department" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Responsável<input [(ngModel)]="form.responsible" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Destinatário<input [(ngModel)]="form.recipient" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Motivo<input [(ngModel)]="form.reason" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Notas<textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir movimentação" [message]="'Excluir movimentação de ' + (toDelete?.ativo_label || (toDelete ? assetLabel(toDelete.ativo_id) : '?')) + '?'" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class MovementsComponent implements OnInit, OnDestroy {
  movements: Movement[] = []; assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: Movement | null = null;
  tipoOpts = ['Entrega','Devolução','Transferência','Descarte','Empréstimo'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.movements = d.movements; this.assets = d.assets; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.movements.filter(m =>
      (!q || m.ativo_label?.toLowerCase().includes(q) || m.responsible?.toLowerCase().includes(q) || m.to_user?.toLowerCase().includes(q) || m.from_user?.toLowerCase().includes(q)) &&
      (!this.filterValues['tipo'] || m.tipo === this.filterValues['tipo'])
    );
  }
  assetLabel(id: string) { const a = this.assets.find(x => x.id === id); return a ? `${a.brand} ${a.model}` : id?.slice(0,8) || '—'; }
  openNew() { this.form = { tipo: 'Entrega', data: new Date().toISOString().slice(0,10) }; this.modalOpen = true; }
  openEdit(m: Movement) { this.form = { ...m }; this.modalOpen = true; }
  async save() {
    if (!this.ux.requireAll([[this.form.ativo_id, 'o ativo'], [this.form.tipo, 'o tipo da movimentação']])) return;
    const a = this.assets.find(x => x.id === this.form.ativo_id);
    if (a) this.form.ativo_label = `${a.type} ${a.brand} ${a.model}`.trim();
    this.saving = true; try { const ok = await this.crud.upsert('movimentacoes', this.form); if (ok) this.modalOpen = false; } finally { this.saving = false; }
  }
  askDelete(m: Movement) { this.toDelete = m; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('movimentacoes', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(m => ({ Ativo: m.ativo_label, Tipo: m.tipo, Data: m.data, De: m.from_user, Para: m.to_user, Responsavel: m.responsible, Motivo: m.reason })), 'movimentacoes'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ ativo_id: r['ativo_id'], ativo_label: r['Ativo']||null, tipo: r['Tipo']||'Entrega', data: r['Data']||new Date().toISOString().slice(0,10), from_user: r['De']||null, to_user: r['Para']||null, responsible: r['Responsavel']||null, reason: r['Motivo']||null })).filter(r => r.ativo_id);
    if (payload.length) await this.crud.bulkInsert('movimentacoes', payload);
    else this.ux.noImportRows('movimentações');
  }
}
