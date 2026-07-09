import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Domain, DnsRecord } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
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
          <thead><tr>
              <th>Domínio</th><th>Registrador</th><th>Status</th><th>Vencimento</th><th>SSL</th><th>Custo</th>
              <th class="text-end">Ações</th>
            </tr></thead>
          <tbody>
            <tr *ngFor="let d of filtered">
              <td class="fw-medium">{{ d.url }}</td>
              <td>{{ d.registrar }}</td>
              <td><span [class]="statusClass(d.status)">{{ d.status }}</span></td>
              <td>{{ d.expirationDate ? (d.expirationDate | date:'dd/MM/yyyy') : '—' }}</td>
              <td>{{ d.sslExpiration ? (d.sslExpiration | date:'dd/MM/yyyy') : '—' }}</td>
              <td>R$ {{ d.renewalCost.toLocaleString('pt-BR') }}</td>
              <td class="text-end">
                <button type="button" (click)="openEdit(d)" class="sig-link-action me-3">Editar</button>
                <button type="button" (click)="askDelete(d)" class="sig-link-action sig-link-action--danger">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhum domínio encontrado</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Domínio' : 'Novo Domínio'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="md:col-span-2 text-sm">Domínio *
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
        <label class="md:col-span-2 text-sm flex items-center gap-2">
          <input type="checkbox" [(ngModel)]="form.auto_renovacao" /> Renovação automática
        </label>
        <label class="md:col-span-2 text-sm">Observações
          <textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
        </label>
      </div>

      <div *ngIf="form.id" class="mt-4 pt-4 border-top">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h3 class="h6 mb-0">Registos DNS</h3>
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="openNewDns()">Adicionar registo</button>
        </div>
        <table class="sig-table sig-table--compact w-full" *ngIf="domainDns.length">
          <thead><tr><th>Tipo</th><th>Nome</th><th>Valor</th><th>TTL</th><th class="text-end">Ações</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of domainDns">
              <td>{{ r.tipo }}</td><td>{{ r.nome }}</td><td>{{ r.valor }}</td><td>{{ r.ttl }}</td>
              <td class="text-end">
                <button type="button" class="sig-link-action me-2" (click)="openEditDns(r)">Editar</button>
                <button type="button" class="sig-link-action sig-link-action--danger" (click)="removeDns(r)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!domainDns.length" class="text-sm text-muted mb-0">Nenhum registo DNS para este domínio.</p>
      </div>
    </app-modal>

    <app-modal [open]="dnsModalOpen" [title]="dnsForm.id ? 'Editar registo DNS' : 'Novo registo DNS'" [saving]="dnsSaving" (close)="dnsModalOpen=false" (save)="saveDns()">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="text-sm">Tipo *
          <select [(ngModel)]="dnsForm.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option>A</option><option>AAAA</option><option>CNAME</option><option>MX</option><option>TXT</option><option>NS</option>
          </select>
        </label>
        <label class="text-sm">Nome *
          <input [(ngModel)]="dnsForm.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="@ ou subdomínio" />
        </label>
        <label class="text-sm md:col-span-2">Valor *
          <input [(ngModel)]="dnsForm.valor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">TTL
          <input type="number" [(ngModel)]="dnsForm.ttl" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
        <label class="text-sm">Prioridade
          <input type="number" [(ngModel)]="dnsForm.prioridade" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
        </label>
      </div>
    </app-modal>

    <app-confirm [open]="confirmOpen" title="Excluir domínio" [message]="'Confirmar exclusão de ' + (toDelete?.url || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class DomainsComponent implements OnInit, OnDestroy {
  domains: Domain[] = [];
  dnsRecords: DnsRecord[] = [];
  loading = true;
  search = '';
  filterValues: Record<string, string> = {};
  modalOpen = false;
  dnsModalOpen = false;
  confirmOpen = false;
  saving = false;
  dnsSaving = false;
  deleting = false;
  form: any = {};
  dnsForm: any = {};
  toDelete: Domain | null = null;
  private sub!: Subscription;

  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
  ngOnInit() {
    this.sub = this.dashboard.data$.subscribe((d) => {
      this.domains = d.domains;
      this.dnsRecords = d.dnsRecords || [];
      this.loading = d.loading;
    });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  get domainDns(): DnsRecord[] {
    if (!this.form.id) return [];
    return this.dnsRecords.filter((r) => r.dominio_id === this.form.id);
  }

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
    this.form = {
      id: d.id,
      nome: d.url,
      registrar: d.registrar,
      dns_provider: d.dnsProvider,
      data_vencimento: d.expirationDate,
      ssl_vencimento: d.sslExpiration,
      custo_renovacao: d.renewalCost,
      status: d.status,
      auto_renovacao: d.autoRenew,
      observacoes: d.observacoes || '',
    };
    this.modalOpen = true;
  }
  async save() {
    if (!this.ux.require(this.form.nome, 'o domínio')) return;
    const payload = this.cleanDates(this.form);
    this.saving = true;
    this.modalOpen = false;
    try {
      const ok = await this.crud.upsert('dominios', payload);
      if (!ok) this.modalOpen = true;
    } finally {
      this.saving = false;
    }
  }
  askDelete(d: Domain) { this.toDelete = d; this.confirmOpen = true; }
  async doDelete() {
    const target = this.toDelete;
    if (!target || this.deleting) return;
    this.deleting = true;
    const ok = await this.crud.remove('dominios', target.id);
    this.deleting = false;
    if (ok) { this.confirmOpen = false; this.toDelete = null; }
  }

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
    else this.ux.noImportRows('domínios');
  }

  private cleanDates(o: any) {
    const out: any = { ...o };
    ['data_vencimento', 'ssl_vencimento'].forEach(k => { if (!out[k]) out[k] = null; });
    return out;
  }

  openNewDns() {
    this.dnsForm = { dominio_id: this.form.id, tipo: 'A', nome: '@', valor: '', ttl: 3600, prioridade: null };
    this.dnsModalOpen = true;
  }

  openEditDns(r: DnsRecord) {
    this.dnsForm = { id: r.id, dominio_id: r.dominio_id, tipo: r.tipo, nome: r.nome, valor: r.valor, ttl: r.ttl, prioridade: r.prioridade };
    this.dnsModalOpen = true;
  }

  async saveDns() {
    if (!this.ux.requireAll([[this.dnsForm.nome, 'o nome'], [this.dnsForm.valor, 'o valor']])) return;
    this.dnsSaving = true;
    try {
      const ok = await this.crud.upsert('dns_records', { ...this.dnsForm });
      if (ok) this.dnsModalOpen = false;
    } finally {
      this.dnsSaving = false;
    }
  }

  async removeDns(r: DnsRecord) {
    await this.crud.remove('dns_records', r.id);
  }
}
