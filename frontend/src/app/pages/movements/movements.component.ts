import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Movement, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
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
      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">De</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Para</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let m of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ m.ativo_label || assetLabel(m.ativo_id) }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.tipo }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.data | date:'dd/MM/yyyy' }}</td>
              <td class="px-4 py-3 text-xs text-gray-500"><div *ngIf="m.from_user">{{ m.from_user }}</div><div *ngIf="m.from_department" class="text-gray-400">{{ m.from_department }}</div></td>
              <td class="px-4 py-3 text-xs text-gray-500"><div *ngIf="m.to_user">{{ m.to_user }}</div><div *ngIf="m.to_department" class="text-gray-400">{{ m.to_department }}</div><div *ngIf="m.recipient">{{ m.recipient }}</div></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.responsible || '—' }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(m)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(m)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhuma movimentação</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Movimentação' : 'Nova Movimentação'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Ativo *
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
        <label class="col-span-2 text-sm">Motivo<input [(ngModel)]="form.reason" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Notas<textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir movimentação" message="Confirmar exclusão?" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class MovementsComponent implements OnInit, OnDestroy {
  movements: Movement[] = []; assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Movement | null = null;
  tipoOpts = ['Entrega','Devolução','Transferência','Descarte','Empréstimo'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
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
    if (!this.form.ativo_id || !this.form.tipo) return;
    const a = this.assets.find(x => x.id === this.form.ativo_id);
    if (a) this.form.ativo_label = `${a.type} ${a.brand} ${a.model}`.trim();
    this.saving = true; const ok = await this.crud.upsert('movimentacoes', this.form); this.saving = false; if (ok) this.modalOpen = false;
  }
  askDelete(m: Movement) { this.toDelete = m; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('movimentacoes', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(m => ({ Ativo: m.ativo_label, Tipo: m.tipo, Data: m.data, De: m.from_user, Para: m.to_user, Responsavel: m.responsible, Motivo: m.reason })), 'movimentacoes'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ ativo_id: r['ativo_id'], ativo_label: r['Ativo']||null, tipo: r['Tipo']||'Entrega', data: r['Data']||new Date().toISOString().slice(0,10), from_user: r['De']||null, to_user: r['Para']||null, responsible: r['Responsavel']||null, reason: r['Motivo']||null })).filter(r => r.ativo_id);
    if (payload.length) await this.crud.bulkInsert('movimentacoes', payload);
  }
}
