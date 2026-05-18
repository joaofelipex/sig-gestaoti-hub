import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Domain } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Domínios & DNS</h1>
          <p class="app-page-sub">Registros, SSL e renovações de domínios.</p>
        </div>
      </header>

      <app-data-toolbar
        searchPlaceholder="Buscar domínio, registrador..."
        [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'Ativo',label:'Ativo'},{value:'Expirando',label:'Expirando'},{value:'Expirado',label:'Expirado'}]}]"
        [filterValues]="filterValues"
        (searchChange)="search=$event"
        (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()"
        (exportClick)="exportCSV()"
        (importFile)="importCSV($event)"
      ></app-data-toolbar>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>

      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domínio</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrador</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSL</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let d of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ d.url }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ d.registrar }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full" [class]="statusClass(d.status)">{{ d.status }}</span></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ d.expirationDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ d.sslExpiration ? (d.sslExpiration | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">R$ {{ d.renewalCost.toLocaleString('pt-BR') }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button type="button" (click)="openEdit(d)" class="sig-link-action me-3">Editar</button>
                <button type="button" (click)="askDelete(d)" class="sig-link-action sig-link-action--danger">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhum domínio encontrado</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Domínio' : 'Novo Domínio'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Domínio *
          <input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" required />
        </label>
        <label class="text-sm">Registrador
          <input [(ngModel)]="form.registrar" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">DNS Provider
          <input [(ngModel)]="form.dns_provider" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">Vencimento
          <input type="date" [(ngModel)]="form.data_vencimento" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">SSL Vencimento
          <input type="date" [(ngModel)]="form.ssl_vencimento" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">Custo Renovação (R$)
          <input type="number" [(ngModel)]="form.custo_renovacao" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>Ativo</option><option>Expirando</option><option>Expirado</option>
          </select>
        </label>
        <label class="col-span-2 text-sm flex items-center gap-2">
          <input type="checkbox" [(ngModel)]="form.auto_renovacao" /> Renovação automática
        </label>
      </div>
    </app-modal>

    <app-confirm [open]="confirmOpen" title="Excluir domínio" [message]="'Confirmar exclusão de ' + (toDelete?.url || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class DomainsComponent implements OnInit, OnDestroy {
  domains: Domain[] = [];
  loading = true;
  search = '';
  filterValues: Record<string, string> = {};
  modalOpen = false;
  confirmOpen = false;
  saving = false;
  form: any = {};
  toDelete: Domain | null = null;
  private sub!: Subscription;

  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.domains = d.domains; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  get filtered() {
    const q = this.search.toLowerCase();
    return this.domains.filter(d =>
      (!q || d.url?.toLowerCase().includes(q) || d.registrar?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || d.status === this.filterValues['status'])
    );
  }

  statusClass(s: string) {
    return s === 'Ativo' ? 'bg-green-100 text-green-800' : s === 'Expirando' ? 'bg-yellow-100 text-yellow-800' : s === 'Expirado' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  }

  openNew() { this.form = { auto_renovacao: true, status: 'Ativo', custo_renovacao: 0 }; this.modalOpen = true; }
  openEdit(d: Domain) {
    this.form = { id: d.id, nome: d.url, registrar: d.registrar, dns_provider: d.dnsProvider, data_vencimento: d.expirationDate, ssl_vencimento: d.sslExpiration, custo_renovacao: d.renewalCost, status: d.status, auto_renovacao: d.autoRenew };
    this.modalOpen = true;
  }
  async save() {
    if (!this.form.nome) return;
    this.saving = true;
    const ok = await this.crud.upsert('dominios', this.cleanDates(this.form));
    this.saving = false;
    if (ok) this.modalOpen = false;
  }
  askDelete(d: Domain) { this.toDelete = d; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('dominios', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }

  exportCSV() {
    exportToCSV(this.filtered.map(d => ({
      Dominio: d.url, Registrador: d.registrar, Status: d.status, Vencimento: d.expirationDate, SSL: d.sslExpiration, Custo: d.renewalCost, AutoRenovacao: d.autoRenew ? 'Sim' : 'Não'
    })), 'dominios');
  }

  async importCSV(file: File) {
    const text = await readFileAsText(file);
    const rows = parseCSV(text);
    const payload = rows.map(r => this.cleanDates({
      nome: r['Dominio'] || r['nome'] || r['Domínio'],
      registrar: r['Registrador'] || r['registrar'] || null,
      data_vencimento: r['Vencimento'] || r['data_vencimento'] || null,
      ssl_vencimento: r['SSL'] || r['ssl_vencimento'] || null,
      custo_renovacao: Number(r['Custo'] || r['custo_renovacao'] || 0) || 0,
      status: r['Status'] || 'Ativo',
      auto_renovacao: (r['AutoRenovacao'] || 'Sim').toLowerCase().startsWith('s'),
    })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('dominios', payload);
  }

  private cleanDates(o: any) {
    const out: any = { ...o };
    ['data_vencimento', 'ssl_vencimento'].forEach(k => { if (!out[k]) out[k] = null; });
    return out;
  }
}
