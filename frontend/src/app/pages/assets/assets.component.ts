import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Ativos (ITAM)</h1>
      <app-data-toolbar
        searchPlaceholder="Buscar tipo, marca, modelo, série..."
        [search]="search"
        [filters]="[{key:'status',label:'Status',options:statusOpts},{key:'type',label:'Tipo',options:typeOpts}]"
        [filterValues]="filterValues"
        (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"
      ></app-data-toolbar>
      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Modelo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Série</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atribuído</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let a of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ a.type }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ a.brand }} {{ a.model }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ a.serialNumber || '—' }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="statusClass(a.status)">{{ a.status }}</span></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ a.assignedTo || 'Não atribuído' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">R$ {{ a.purchaseValue.toLocaleString('pt-BR') }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(a)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(a)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhum ativo</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Ativo' : 'Novo Ativo'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="text-sm">Tipo *
          <select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>Notebook</option><option>Desktop</option><option>Monitor</option><option>Impressora</option><option>TV</option><option>Servidor</option><option>Periférico</option><option>Outro</option>
          </select>
        </label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option value="ativo">Em uso</option><option value="estoque">Estoque</option><option value="manutencao">Manutenção</option><option value="aposentado">Aposentado</option>
          </select>
        </label>
        <label class="text-sm">Marca<input [(ngModel)]="form.marca" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Modelo<input [(ngModel)]="form.modelo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Número Série<input [(ngModel)]="form.numero_serie" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Patrimônio<input [(ngModel)]="form.patrimonio" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Atribuído a<input [(ngModel)]="form.assigned_to" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Departamento<input [(ngModel)]="form.department_nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Aquisição<input type="date" [(ngModel)]="form.data_aquisicao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Garantia até<input type="date" [(ngModel)]="form.warranty_end" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Valor (R$)<input type="number" step="0.01" [(ngModel)]="form.valor_aquisicao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Vida útil (meses)<input type="number" [(ngModel)]="form.vida_util_meses" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" rows="2"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir ativo" [message]="'Excluir ' + (toDelete?.brand || '') + ' ' + (toDelete?.model || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class AssetsComponent implements OnInit, OnDestroy {
  assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Asset | null = null;
  statusOpts = ['Em uso','Estoque','Manutenção','Aposentado'].map(v=>({value:v,label:v}));
  typeOpts = ['Notebook','Desktop','Monitor','Impressora','TV','Servidor','Periférico'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.assets = d.assets; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.assets.filter(a =>
      (!q || a.type?.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q) || a.model?.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q) || a.assignedTo?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || a.status === this.filterValues['status']) &&
      (!this.filterValues['type'] || a.type === this.filterValues['type'])
    );
  }
  statusClass(s: string) { return s === 'Em uso' ? 'bg-green-100 text-green-800' : s === 'Estoque' ? 'bg-blue-100 text-blue-800' : s === 'Manutenção' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'; }
  openNew() { this.form = { tipo: 'Notebook', status: 'ativo', valor_aquisicao: 0, vida_util_meses: 60 }; this.modalOpen = true; }
  openEdit(a: Asset) {
    const statusMap: any = { 'Em uso':'ativo','Estoque':'estoque','Manutenção':'manutencao','Aposentado':'aposentado' };
    this.form = { id: a.id, tipo: a.type, status: statusMap[a.status]||'ativo', marca: a.brand, modelo: a.model, numero_serie: a.serialNumber, assigned_to: a.assignedTo, department_nome: a.department, data_aquisicao: a.purchaseDate, warranty_end: a.warrantyEnd, valor_aquisicao: a.purchaseValue };
    this.modalOpen = true;
  }
  async save() { if (!this.form.tipo) return; this.saving = true; const o = { ...this.form }; ['data_aquisicao','warranty_end'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('ativos', o); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(a: Asset) { this.toDelete = a; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('ativos', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(a => ({ Tipo: a.type, Marca: a.brand, Modelo: a.model, Serie: a.serialNumber, Status: a.status, Atribuido: a.assignedTo, Departamento: a.department, Aquisicao: a.purchaseDate, Valor: a.purchaseValue })), 'ativos'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const map: any = { 'Em uso':'ativo','Estoque':'estoque','Manutenção':'manutencao','Aposentado':'aposentado' };
    const payload = rows.map(r => ({ tipo: r['Tipo']||'Notebook', marca: r['Marca']||null, modelo: r['Modelo']||null, numero_serie: r['Serie']||null, status: map[r['Status']]||'ativo', assigned_to: r['Atribuido']||null, department_nome: r['Departamento']||null, data_aquisicao: r['Aquisicao']||null, valor_aquisicao: Number(r['Valor']||0) })).filter(r => r.tipo);
    if (payload.length) await this.crud.bulkInsert('ativos', payload);
  }
}
