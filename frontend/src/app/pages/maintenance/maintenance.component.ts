import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Maintenance, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
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
      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abertura</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conclusão</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let m of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ assetLabel(m.ativo_id) }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.tipo }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="statusClass(m.status)">{{ m.status }}</span></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.data_abertura | date:'dd/MM/yyyy' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.data_conclusao ? (m.data_conclusao | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.fornecedor || '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ m.custo ? 'R$ ' + m.custo.toLocaleString('pt-BR') : '—' }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(m)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(m)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="8" class="text-center py-8 text-sm text-gray-400">Nenhuma manutenção</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Manutenção' : 'Nova Manutenção'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Ativo *
          <select [(ngModel)]="form.ativo_id" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Selecione...</option>
            <option *ngFor="let a of assets" [value]="a.id">{{ a.type }} {{ a.brand }} {{ a.model }} ({{ a.serialNumber || a.id.slice(0,8) }})</option>
          </select>
        </label>
        <label class="text-sm">Tipo *<select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Preventiva</option><option>Corretiva</option><option>Atualização</option></select></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></label>
        <label class="text-sm">Abertura<input type="date" [(ngModel)]="form.data_abertura" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Conclusão<input type="date" [(ngModel)]="form.data_conclusao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Fornecedor<input [(ngModel)]="form.fornecedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Custo (R$)<input type="number" step="0.01" [(ngModel)]="form.custo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Descrição<textarea [(ngModel)]="form.descricao" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir manutenção" message="Confirmar exclusão?" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  maintenance: Maintenance[] = []; assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Maintenance | null = null;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
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
  statusClass(s: string) { return s === 'concluida' ? 'bg-green-100 text-green-800' : s === 'em_andamento' ? 'bg-blue-100 text-blue-800' : s === 'aberta' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'; }
  openNew() { this.form = { tipo: 'Preventiva', status: 'aberta', data_abertura: new Date().toISOString().slice(0,10) }; this.modalOpen = true; }
  openEdit(m: Maintenance) { this.form = { ...m }; this.modalOpen = true; }
  async save() { if (!this.form.ativo_id || !this.form.tipo) return; this.saving = true; const o = { ...this.form }; if (!o.data_conclusao) o.data_conclusao = null; if (!o.custo) o.custo = null; const ok = await this.crud.upsert('manutencoes', o); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(m: Maintenance) { this.toDelete = m; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('manutencoes', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(m => ({ Ativo: this.assetLabel(m.ativo_id), Tipo: m.tipo, Status: m.status, Abertura: m.data_abertura, Conclusao: m.data_conclusao, Fornecedor: m.fornecedor, Custo: m.custo, Descricao: m.descricao })), 'manutencoes'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ ativo_id: r['ativo_id'], tipo: r['Tipo']||'Preventiva', status: r['Status']||'aberta', data_abertura: r['Abertura']||new Date().toISOString().slice(0,10), data_conclusao: r['Conclusao']||null, fornecedor: r['Fornecedor']||null, custo: Number(r['Custo']||0)||null, descricao: r['Descricao']||null })).filter(r => r.ativo_id);
    if (payload.length) await this.crud.bulkInsert('manutencoes', payload);
  }
}
