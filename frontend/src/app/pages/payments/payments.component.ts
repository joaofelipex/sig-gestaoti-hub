import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Payment } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { KpiCardComponent } from '../../components/charts.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent, KpiCardComponent],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-2xl font-bold">Pagamentos</h1>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <app-kpi-card label="Pendente" [value]="brl(totals.pendente)" icon="⏳" color="#f59e0b"></app-kpi-card>
        <app-kpi-card label="Atrasado" [value]="brl(totals.atrasado)" icon="🚨" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Pago no mês" [value]="brl(totals.pago)" icon="✅" color="#10b981"></app-kpi-card>
        <app-kpi-card label="Total Filtrado" [value]="brl(totals.total)" icon="💰" color="#3b82f6"></app-kpi-card>
      </div>

      <app-data-toolbar searchPlaceholder="Buscar nome, fornecedor..." [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'pendente',label:'Pendente'},{value:'pago',label:'Pago'},{value:'atrasado',label:'Atrasado'}]},{key:'categoria',label:'Categoria',options:catOpts}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>

      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let p of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ p.nome }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ p.categoria }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ p.competencia | date:'MM/yyyy' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ p.vencimento ? (p.vencimento | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ brl(p.valor) }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="statusClass(p.status)">{{ p.status }}</span></td>
              <td class="px-4 py-3 text-right text-sm">
                <button *ngIf="p.status !== 'pago'" (click)="markPaid(p)" class="text-green-600 hover:underline mr-3">Pagar</button>
                <button (click)="openEdit(p)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(p)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhum pagamento</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Pagamento' : 'Novo Pagamento'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Categoria<select [(ngModel)]="form.categoria" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="servidor">Servidor</option><option value="licenca">Licença</option><option value="dominio">Domínio</option><option value="contrato">Contrato</option><option value="outro">Outro</option></select></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option></select></label>
        <label class="text-sm">Competência<input type="date" [(ngModel)]="form.competencia" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Vencimento<input type="date" [(ngModel)]="form.vencimento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Valor (R$)<input type="number" step="0.01" [(ngModel)]="form.valor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Data Pagamento<input type="date" [(ngModel)]="form.data_pagamento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Fornecedor<input [(ngModel)]="form.fornecedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir pagamento" [message]="'Excluir ' + (toDelete?.nome || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class PaymentsComponent implements OnInit, OnDestroy {
  payments: Payment[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Payment | null = null;
  catOpts = [{value:'servidor',label:'Servidor'},{value:'licenca',label:'Licença'},{value:'dominio',label:'Domínio'},{value:'contrato',label:'Contrato'},{value:'outro',label:'Outro'}];
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.payments = d.payments; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.payments.filter(p =>
      (!q || p.nome?.toLowerCase().includes(q) || p.fornecedor?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || p.status === this.filterValues['status']) &&
      (!this.filterValues['categoria'] || p.categoria === this.filterValues['categoria'])
    );
  }
  get totals() {
    const r = { pendente: 0, atrasado: 0, pago: 0, total: 0 };
    for (const p of this.filtered) { r.total += p.valor; (r as any)[p.status] = ((r as any)[p.status] || 0) + p.valor; }
    return r;
  }
  brl(v: number) { return 'R$ ' + (v||0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
  statusClass(s: string) { return s === 'pago' ? 'bg-green-100 text-green-800' : s === 'atrasado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'; }
  openNew() { this.form = { categoria: 'outro', status: 'pendente', valor: 0, competencia: new Date().toISOString().slice(0,10) }; this.modalOpen = true; }
  openEdit(p: Payment) { this.form = { ...p }; this.modalOpen = true; }
  async markPaid(p: Payment) { await this.crud.upsert('pagamentos', { id: p.id, status: 'pago', data_pagamento: new Date().toISOString().slice(0,10) }); }
  async save() { if (!this.form.nome) return; this.saving = true; const o = { ...this.form }; ['vencimento','data_pagamento','competencia'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('pagamentos', o); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(p: Payment) { this.toDelete = p; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('pagamentos', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(p => ({ Nome: p.nome, Categoria: p.categoria, Competencia: p.competencia, Vencimento: p.vencimento, Valor: p.valor, Status: p.status, Fornecedor: p.fornecedor })), 'pagamentos'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Nome'], categoria: r['Categoria']||'outro', competencia: r['Competencia']||new Date().toISOString().slice(0,10), vencimento: r['Vencimento']||null, valor: Number(r['Valor']||0), status: r['Status']||'pendente', fornecedor: r['Fornecedor']||null })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('pagamentos', payload);
  }
}
