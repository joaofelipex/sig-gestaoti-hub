import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Payment } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { TablePagerComponent } from '../../components/table-pager.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { KpiCardComponent } from '../../components/charts.component';
import { TiMetricsService, TiMetrics } from '../../services/ti-metrics.service';
import { formatBrl } from '../../utils/financial.util';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { mapPaymentCsvRows, paymentExportColumns } from '../../utils/payments-csv.util';
import { SigIcons } from '../../core/sig-icons';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, TablePagerComponent, ModalComponent, ConfirmComponent, KpiCardComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Pagamentos</h1>
          <p class="app-page-sub">Despesas registradas — confrontadas com o custo operacional do Painel e Economista.</p>
        </div>
      </header>

      <div class="sig-kpi-grid sig-kpi-grid--5">
        <app-kpi-card label="Pendente" [value]="brl(totals.pendente)" [icon]="icons.pending" color="#f59e0b"></app-kpi-card>
        <app-kpi-card label="Atrasado" [value]="brl(totals.atrasado)" [icon]="icons.overdue" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Pago no mês" [value]="brl(totals.pago)" [icon]="icons.success" color="#10b981"></app-kpi-card>
        <app-kpi-card label="Total filtrado" [value]="brl(totals.total)" [icon]="icons.cost" color="#3b82f6"></app-kpi-card>
        <app-kpi-card label="Custo mensal SAM" [value]="brl(ti?.operationalMonthlyCost ?? 0)" [icon]="icons.cost" color="#10b981" [hint]="samHint"></app-kpi-card>
      </div>

      <app-data-toolbar searchPlaceholder="Buscar nome, fornecedor..." [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'pendente',label:'Pendente'},{value:'pago',label:'Pago'},{value:'atrasado',label:'Atrasado'}]},{key:'categoria',label:'Categoria',options:catOpts}]"
        [filterValues]="filterValues" (searchChange)="onSearchChange($event)" (filterChange)="onFilterChange($event)"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Nome</th><th>Categoria</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let p of paged">
              <td class="fw-medium">{{ p.nome }}</td>
              <td>{{ p.categoria }}</td>
              <td>{{ p.competencia | date:'MM/yyyy' }}</td>
              <td>{{ p.vencimento ? (p.vencimento | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="fw-medium">{{ brl(p.valor) }}</td>
              <td><span [class]="statusClass(p.status)">{{ p.status }}</span></td>
              <td class="text-end">
                <button *ngIf="p.status !== 'pago'" type="button" (click)="markPaid(p)" [disabled]="payingId === p.id" class="sig-link-action sig-link-action--success me-3">{{ payingId === p.id ? 'Pagando...' : 'Pagar' }}</button>
                <button type="button" (click)="openEdit(p)" class="sig-link-action me-3">Editar</button>
                <button type="button" (click)="askDelete(p)" class="sig-link-action sig-link-action--danger">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhum pagamento</td></tr>
          </tbody>
        </table>
        </div>
        <app-table-pager
          [total]="filtered.length"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          (pageIndexChange)="pageIndex = $event"
          (pageSizeChange)="onPageSizeChange($event)"
        ></app-table-pager>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Pagamento' : 'Novo Pagamento'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="md:col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Categoria<select [(ngModel)]="form.categoria" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="servidor">Servidor</option><option value="licenca">Licença</option><option value="dominio">Domínio</option><option value="contrato">Contrato</option><option value="outro">Outro</option></select></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option></select></label>
        <label class="text-sm">Competência<input type="date" [(ngModel)]="form.competencia" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Vencimento<input type="date" [(ngModel)]="form.vencimento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Valor (R$)<input type="number" step="0.01" [(ngModel)]="form.valor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Data Pagamento<input type="date" [(ngModel)]="form.data_pagamento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Fornecedor<input [(ngModel)]="form.fornecedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="md:col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir pagamento" [message]="'Excluir ' + (toDelete?.nome || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class PaymentsComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  payments: Payment[] = []; loading = true; search = ''; filterValues: any = {};
  pageIndex = 0;
  pageSize = 25;
  readonly pageSizeOptions = [10, 25, 50, 100, 0];
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; payingId: string | null = null; form: any = {}; toDelete: Payment | null = null;
  catOpts = [{value:'servidor',label:'Servidor'},{value:'licenca',label:'Licença'},{value:'dominio',label:'Domínio'},{value:'contrato',label:'Contrato'},{value:'outro',label:'Outro'}];
  ti: TiMetrics | null = null;
  samHint = '';
  private sub!: Subscription;
  private metricsSub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService, private tiMetrics: TiMetricsService) {}
  ngOnInit() {
    this.sub = this.dashboard.data$.subscribe(d => {
      this.payments = d.payments;
      this.loading = d.loading;
      this.clampPageIndex();
    });
    this.metricsSub = this.tiMetrics.metrics$.subscribe(m => {
      this.ti = m;
      if (!m.loading) {
        this.samHint = m.operationalCostHint + ' · base Painel/Economista';
      }
    });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); this.metricsSub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.payments.filter(p =>
      (!q || p.nome?.toLowerCase().includes(q) || p.fornecedor?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || p.status === this.filterValues['status']) &&
      (!this.filterValues['categoria'] || p.categoria === this.filterValues['categoria'])
    );
  }
  get paged(): Payment[] {
    const items = this.filtered;
    if (!this.pageSize) return items;
    const start = this.pageIndex * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }
  get totals() {
    const r = { pendente: 0, atrasado: 0, pago: 0, total: 0 };
    for (const p of this.filtered) { r.total += p.valor; (r as any)[p.status] = ((r as any)[p.status] || 0) + p.valor; }
    return r;
  }
  brl(v: number) { return formatBrl(v); }
  onSearchChange(value: string) {
    this.search = value;
    this.pageIndex = 0;
  }
  onFilterChange(event: { key: string; value: string }) {
    this.filterValues[event.key] = event.value;
    this.pageIndex = 0;
  }
  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 0;
  }
  private clampPageIndex() {
    if (!this.pageSize) {
      this.pageIndex = 0;
      return;
    }
    const maxPage = Math.max(0, Math.ceil(this.filtered.length / this.pageSize) - 1);
    if (this.pageIndex > maxPage) this.pageIndex = maxPage;
  }
  statusClass(s: string) { return s === 'pago' ? 'bg-green-100 text-green-800' : s === 'atrasado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'; }
  openNew() { this.form = { categoria: 'outro', status: 'pendente', valor: 0, competencia: new Date().toISOString().slice(0,10) }; this.modalOpen = true; }
  openEdit(p: Payment) { this.form = { ...p }; this.modalOpen = true; }
  async markPaid(p: Payment) { if (this.payingId) return; this.payingId = p.id; try { await this.crud.upsert('pagamentos', { id: p.id, status: 'pago', data_pagamento: new Date().toISOString().slice(0,10) }); } finally { this.payingId = null; } }
  async save() { if (!this.ux.require(this.form.nome, 'o nome do pagamento')) return; this.saving = true; try { const o = { ...this.form }; ['vencimento','data_pagamento','competencia'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('pagamentos', o); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(p: Payment) { this.toDelete = p; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('pagamentos', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() {
    exportToCSV(this.filtered.map((p) => paymentExportColumns(p)), 'pagamentos');
  }

  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = mapPaymentCsvRows(rows);
    if (payload.length) await this.crud.bulkInsert('pagamentos', payload);
    else this.ux.noImportRows('pagamentos');
  }
}
