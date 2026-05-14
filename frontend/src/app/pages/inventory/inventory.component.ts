import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Inventory } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Estoque</h1>
      <app-data-toolbar searchPlaceholder="Buscar item, SKU, fornecedor..." [search]="search"
        [filters]="[{key:'categoria',label:'Categoria',options:catOpts},{key:'lowStock',label:'Estoque',options:[{value:'low',label:'Abaixo do mínimo'}]}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let i of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ i.nome }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ i.categoria }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="qtyClass(i)">{{ i.quantity }} {{ i.unit }}</span></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ i.min_quantity }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">R$ {{ i.unit_cost.toLocaleString('pt-BR') }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ i.location || '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ i.supplier || '—' }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(i)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(i)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="8" class="text-center py-8 text-sm text-gray-400">Nenhum item</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Item' : 'Novo Item'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Categoria<select [(ngModel)]="form.categoria" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option *ngFor="let c of categorias">{{c}}</option></select></label>
        <label class="text-sm">SKU<input [(ngModel)]="form.sku" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Quantidade<input type="number" [(ngModel)]="form.quantity" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Mínimo<input type="number" [(ngModel)]="form.min_quantity" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Unidade<input [(ngModel)]="form.unit" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="un, m, kg..."/></label>
        <label class="text-sm">Custo Unit. (R$)<input type="number" step="0.01" [(ngModel)]="form.unit_cost" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Localização<input [(ngModel)]="form.location" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Fornecedor<input [(ngModel)]="form.supplier" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Notas<textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir item" [message]="'Excluir ' + (toDelete?.nome || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class InventoryComponent implements OnInit, OnDestroy {
  inventory: Inventory[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Inventory | null = null;
  categorias = ['Cabo','Áudio','Vídeo','Periférico','Acessório','Consumível','Outros'];
  catOpts = this.categorias.map(c=>({value:c,label:c}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.inventory = d.inventory; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.inventory.filter(i =>
      (!q || i.nome?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.supplier?.toLowerCase().includes(q)) &&
      (!this.filterValues['categoria'] || i.categoria === this.filterValues['categoria']) &&
      (this.filterValues['lowStock'] !== 'low' || i.quantity <= i.min_quantity)
    );
  }
  qtyClass(i: Inventory) { return i.quantity <= i.min_quantity ? 'bg-red-100 text-red-800' : i.quantity <= i.min_quantity * 1.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; }
  openNew() { this.form = { categoria: 'Outros', unit: 'un', quantity: 0, min_quantity: 0, unit_cost: 0 }; this.modalOpen = true; }
  openEdit(i: Inventory) { this.form = { ...i }; this.modalOpen = true; }
  async save() { if (!this.form.nome) return; this.saving = true; const ok = await this.crud.upsert('inventario', this.form); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(i: Inventory) { this.toDelete = i; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('inventario', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(i => ({ Nome: i.nome, Categoria: i.categoria, SKU: i.sku, Quantidade: i.quantity, Minimo: i.min_quantity, Unidade: i.unit, Custo: i.unit_cost, Local: i.location, Fornecedor: i.supplier })), 'estoque'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Nome'], categoria: r['Categoria']||'Outros', sku: r['SKU']||null, quantity: Number(r['Quantidade']||0), min_quantity: Number(r['Minimo']||0), unit: r['Unidade']||'un', unit_cost: Number(r['Custo']||0), location: r['Local']||null, supplier: r['Fornecedor']||null })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('inventario', payload);
  }
}
