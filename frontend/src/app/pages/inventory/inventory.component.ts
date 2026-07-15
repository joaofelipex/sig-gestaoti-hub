import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Inventory } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigBadge } from '../../utils/status-badge';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Estoque</h1>
          <p class="app-page-sub">Itens em estoque e reposição.</p>
        </div>
      </header>
      <app-data-toolbar searchPlaceholder="Buscar item, SKU, fornecedor..." [search]="search"
        [filters]="[{key:'categoria',label:'Categoria',options:catOpts},{key:'lowStock',label:'Estoque',options:[{value:'low',label:'Abaixo do mínimo'}]}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Nome</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Custo</th><th>Local</th><th>Fornecedor</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let i of filtered">
              <td class="fw-medium">{{ i.nome }}</td>
              <td>{{ i.categoria }}</td>
              <td><span [class]="qtyClass(i)">{{ i.quantity }} {{ i.unit }}</span></td>
              <td>{{ i.min_quantity }}</td>
              <td>R$ {{ i.unit_cost.toLocaleString('pt-BR') }}</td>
              <td>{{ i.location || '—' }}</td>
              <td>{{ i.supplier || '—' }}</td>
              <td class="text-end">
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(i)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(i)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="8" class="sig-table-empty">Nenhum item</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Item' : 'Novo Item'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="md:col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Categoria<select [(ngModel)]="form.categoria" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option *ngFor="let c of categorias">{{c}}</option></select></label>
        <label class="text-sm">SKU<input [(ngModel)]="form.sku" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Quantidade<input type="number" [(ngModel)]="form.quantity" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Mínimo<input type="number" [(ngModel)]="form.min_quantity" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Unidade<input [(ngModel)]="form.unit" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="un, m, kg..."/></label>
        <label class="text-sm">Custo Unit. (R$)<input type="number" step="0.01" [(ngModel)]="form.unit_cost" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Localização<input [(ngModel)]="form.location" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Fornecedor<input [(ngModel)]="form.supplier" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Notas<textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir item" [message]="'Excluir ' + (toDelete?.nome || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class InventoryComponent implements OnInit, OnDestroy {
  inventory: Inventory[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: Inventory | null = null;
  categorias = ['Cabo','Áudio','Vídeo','Periférico','Acessório','Consumível','Outros'];
  catOpts = this.categorias.map(c=>({value:c,label:c}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
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
  qtyClass(i: Inventory) {
    return i.quantity <= i.min_quantity ? SigBadge.danger : i.quantity <= i.min_quantity * 1.5 ? SigBadge.warning : SigBadge.success;
  }
  openNew() { this.form = { categoria: 'Outros', unit: 'un', quantity: 0, min_quantity: 0, unit_cost: 0 }; this.modalOpen = true; }
  openEdit(i: Inventory) { this.form = { ...i }; this.modalOpen = true; }
  async save() { if (!this.ux.require(this.form.nome, 'o nome do item')) return; this.saving = true; try { const ok = await this.crud.upsert('inventario', this.form); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(i: Inventory) { this.toDelete = i; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('inventario', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(i => ({ Nome: i.nome, Categoria: i.categoria, SKU: i.sku, Quantidade: i.quantity, Minimo: i.min_quantity, Unidade: i.unit, Custo: i.unit_cost, Local: i.location, Fornecedor: i.supplier })), 'estoque'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Nome'], categoria: r['Categoria']||'Outros', sku: r['SKU']||null, quantity: Number(r['Quantidade']||0), min_quantity: Number(r['Minimo']||0), unit: r['Unidade']||'un', unit_cost: Number(r['Custo']||0), location: r['Local']||null, supplier: r['Fornecedor']||null })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('inventario', payload);
    else this.ux.noImportRows('itens');
  }
}
