import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, License } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Licenças (SAM)</h1>

      <app-data-toolbar
        searchPlaceholder="Buscar software, fornecedor..."
        [search]="search"
        [filters]="[{key:'tipo',label:'Tipo',options:[{value:'Mensal',label:'Mensal'},{value:'Anual',label:'Anual'}]},{key:'categoria',label:'Categoria',options:catOpts}]"
        [filterValues]="filterValues"
        (searchChange)="search=$event"
        (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"
      ></app-data-toolbar>

      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Software</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Em Uso</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renovação</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let l of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ l.software }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.vendor }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.type }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.category }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.totalLicenses }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.usedLicenses }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">R$ {{ l.costPerUnit.toLocaleString('pt-BR') }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ l.renewalDate ? (l.renewalDate | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(l)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(l)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="9" class="text-center py-8 text-sm text-gray-400">Nenhuma licença</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Licença' : 'Nova Licença'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Software *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Fornecedor<input [(ngModel)]="form.fornecedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Categoria
          <select [(ngModel)]="form.categoria" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>Produtividade</option><option>Design</option><option>Desenvolvimento</option><option>Segurança</option><option>Comunicação</option><option>Outros</option>
          </select>
        </label>
        <label class="text-sm">Tipo
          <select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Mensal</option><option>Anual</option></select>
        </label>
        <label class="text-sm">Total Licenças<input type="number" [(ngModel)]="form.total_licencas" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Em Uso<input type="number" [(ngModel)]="form.qtd_usuarios" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Custo Unitário (R$)<input type="number" step="0.01" [(ngModel)]="form.custo_unitario" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Renovação<input type="date" [(ngModel)]="form.data_renovacao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Chave de Ativação<input [(ngModel)]="form.chave_ativacao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
      </div>
    </app-modal>

    <app-confirm [open]="confirmOpen" title="Excluir licença" [message]="'Excluir ' + (toDelete?.software || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class LicensesComponent implements OnInit, OnDestroy {
  licenses: License[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: License | null = null;
  catOpts = ['Produtividade','Design','Desenvolvimento','Segurança','Comunicação','Outros'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.licenses = d.licenses; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.licenses.filter(l =>
      (!q || l.software?.toLowerCase().includes(q) || l.vendor?.toLowerCase().includes(q)) &&
      (!this.filterValues['tipo'] || l.type === this.filterValues['tipo']) &&
      (!this.filterValues['categoria'] || l.category === this.filterValues['categoria'])
    );
  }
  openNew() { this.form = { tipo: 'Mensal', categoria: 'Produtividade', total_licencas: 1, qtd_usuarios: 0, custo_unitario: 0 }; this.modalOpen = true; }
  openEdit(l: License) { this.form = { id: l.id, nome: l.software, fornecedor: l.vendor, tipo: l.type, categoria: l.category, total_licencas: l.totalLicenses, qtd_usuarios: l.usedLicenses, custo_unitario: l.costPerUnit, chave_ativacao: l.activationKey, data_renovacao: l.renewalDate }; this.modalOpen = true; }
  async save() { if (!this.form.nome) return; this.saving = true; const o = { ...this.form }; if (!o.data_renovacao) o.data_renovacao = null; const ok = await this.crud.upsert('licencas', o); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(l: License) { this.toDelete = l; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('licencas', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(l => ({ Software: l.software, Fornecedor: l.vendor, Tipo: l.type, Categoria: l.category, Total: l.totalLicenses, EmUso: l.usedLicenses, Custo: l.costPerUnit, Renovacao: l.renewalDate })), 'licencas'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Software']||r['nome'], fornecedor: r['Fornecedor']||null, tipo: r['Tipo']||'Mensal', categoria: r['Categoria']||'Produtividade', total_licencas: Number(r['Total']||1), qtd_usuarios: Number(r['EmUso']||0), custo_unitario: Number(r['Custo']||0), data_renovacao: r['Renovacao']||null })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('licencas', payload);
  }
}
