import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Asset } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigBadge } from '../../utils/status-badge';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Ativos (ITAM)</h1>
          <p class="app-page-sub">Inventário de hardware e periféricos da organização.</p>
        </div>
      </header>
      <app-data-toolbar
        searchPlaceholder="Buscar tipo, marca, modelo, série..."
        [search]="search"
        [filters]="[{key:'status',label:'Status',options:statusOpts},{key:'type',label:'Tipo',options:typeOpts}]"
        [filterValues]="filterValues"
        (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"
      ></app-data-toolbar>
      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Tipo</th>
            <th>Marca/Modelo</th>
            <th>Série</th>
            <th>Status</th>
            <th>Atribuído</th>
            <th>Valor</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let a of filtered">
              <td class="fw-medium">{{ a.type }}</td>
              <td>{{ a.brand }} {{ a.model }}</td>
              <td>{{ a.serialNumber || '—' }}</td>
              <td><span [class]="statusClass(a.status)">{{ a.status }}</span></td>
              <td>{{ a.assignedTo || 'Não atribuído' }}</td>
              <td>R$ {{ a.purchaseValue.toLocaleString('pt-BR') }}</td>
              <td class="text-end">
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(a)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(a)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhum ativo</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Ativo' : 'Novo Ativo'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="text-sm">Tipo *
          <select [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>Notebook</option><option>Desktop</option><option>Monitor</option><option>Impressora</option><option>TV</option><option>Servidor</option><option>Periférico</option><option>Outro</option>
          </select>
        </label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option value="ativo">Em uso</option><option value="estoque">Estoque</option><option value="manutencao">Manutenção</option><option value="descartado">Aposentado</option>
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
        <label class="md:col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" rows="2"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir ativo" [message]="'Excluir ' + (toDelete?.brand || '') + ' ' + (toDelete?.model || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class AssetsComponent implements OnInit, OnDestroy {
  assets: Asset[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: Asset | null = null;
  statusOpts = ['Em uso','Estoque','Manutenção','Aposentado'].map(v=>({value:v,label:v}));
  typeOpts = ['Notebook','Desktop','Monitor','Impressora','TV','Servidor','Periférico'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
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
  statusClass(s: string) {
    return s === 'Em uso' ? SigBadge.success : s === 'Estoque' ? SigBadge.info : s === 'Manutenção' ? SigBadge.warning : SigBadge.neutral;
  }
  openNew() { this.form = { tipo: 'Notebook', status: 'ativo', valor_aquisicao: 0, vida_util_meses: 60 }; this.modalOpen = true; }
  openEdit(a: Asset) {
    const statusMap: any = { 'Em uso':'ativo','Estoque':'estoque','Manutenção':'manutencao','Aposentado':'descartado' };
    this.form = {
      id: a.id,
      empresa_id: (a as any).empresa_id ?? null,
      tipo: a.type,
      status: statusMap[a.status] || 'ativo',
      marca: a.brand,
      modelo: a.model,
      numero_serie: a.serialNumber,
      patrimonio: a.patrimonio || '',
      assigned_to: a.assignedTo,
      department_nome: a.department,
      data_aquisicao: a.purchaseDate,
      warranty_end: a.warrantyEnd,
      valor_aquisicao: a.purchaseValue,
      vida_util_meses: a.vidaUtilMeses,
      observacoes: a.observacoes || '',
    };
    this.modalOpen = true;
  }
  async save() { if (!this.ux.require(this.form.tipo, 'o tipo do ativo')) return; this.saving = true; try { const o = { ...this.form }; ['data_aquisicao','warranty_end'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('ativos', o); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(a: Asset) { this.toDelete = a; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('ativos', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(a => ({ Tipo: a.type, Marca: a.brand, Modelo: a.model, Serie: a.serialNumber, Status: a.status, Atribuido: a.assignedTo, Departamento: a.department, Aquisicao: a.purchaseDate, Valor: a.purchaseValue })), 'ativos'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const map: any = { 'Em uso':'ativo','Estoque':'estoque','Manutenção':'manutencao','Aposentado':'descartado' };
    const payload = rows.map(r => ({ tipo: r['Tipo']||'Notebook', marca: r['Marca']||null, modelo: r['Modelo']||null, numero_serie: r['Serie']||null, status: map[r['Status']]||'ativo', assigned_to: r['Atribuido']||null, department_nome: r['Departamento']||null, data_aquisicao: r['Aquisicao']||null, valor_aquisicao: Number(r['Valor']||0) })).filter(r => r.tipo);
    if (payload.length) await this.crud.bulkInsert('ativos', payload);
    else this.ux.noImportRows('ativos');
  }
}
