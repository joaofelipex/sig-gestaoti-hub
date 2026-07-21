import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Domain, DnsRecord } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { DateInputComponent } from '../../components/date-input.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { exportToICS, IcsEvent } from '../../utils/ics.util';
import { SigBadge } from '../../utils/status-badge';
import { DOMAIN_STATUSES, normalizeDomainStatus } from '../../utils/domain.util';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, DateInputComponent, ModalComponent, ConfirmComponent],
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
        [filters]="[{key:'status',label:'Status',options:statusFilterOpts}]"
        [filterValues]="filterValues"
        [showCalendarExport]="true"
        (searchChange)="search=$event"
        (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()"
        (exportClick)="exportCSV()"
        (calendarClick)="exportICS()"
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
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(d)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(d)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="sig-table-empty">Nenhum domínio encontrado</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Domínio' : 'Novo Domínio'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
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
          <app-date-input [(ngModel)]="form.data_vencimento" ariaLabel="Vencimento"></app-date-input>
        </label>
        <label class="text-sm">SSL Vencimento
          <app-date-input [(ngModel)]="form.ssl_vencimento" ariaLabel="SSL Vencimento"></app-date-input>
        </label>
        <label class="text-sm">Custo Renovação (R$)
          <input type="number" [(ngModel)]="form.custo_renovacao" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
          </select>
        </label>
        <label class="md:col-span-2 text-sm flex items-center gap-2">
          <input type="checkbox" [(ngModel)]="form.auto_renovacao" /> Renovação automática
        </label>
        <label class="md:col-span-2 text-sm">Observações
          <textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
        </label>
      </div>

      <div *ngIf="form.id" class="mt-3 pt-3 border-top">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h3 class="h6 mb-0">Registos DNS</h3>
          <button type="button" class="sig-link-action" (click)="openNewDns()">Adicionar registo</button>
        </div>
        <div class="sig-table-wrap" *ngIf="domainDns.length">
          <table class="sig-table sig-table--compact">
            <thead><tr><th>Tipo</th><th>Nome</th><th>Valor</th><th>TTL</th><th class="text-end">Ações</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of domainDns">
                <td>{{ r.tipo }}</td>
                <td>{{ r.nome }}</td>
                <td class="sig-table-cell-break">{{ r.valor }}</td>
                <td>{{ r.ttl }}</td>
                <td class="text-end">
                  <div class="sig-row-actions">
                    <button type="button" class="sig-link-action" (click)="openEditDns(r)" title="Editar">
                      <i class="fas fa-pen" aria-hidden="true"></i>
                      <span>Editar</span>
                    </button>
                    <button type="button" class="sig-link-action sig-link-action--danger" (click)="removeDns(r)" title="Excluir">
                      <i class="fas fa-trash-alt" aria-hidden="true"></i>
                      <span>Excluir</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p *ngIf="!domainDns.length" class="text-sm text-muted mb-0">Nenhum registo DNS para este domínio.</p>
      </div>
    </app-modal>

    <app-modal [open]="dnsModalOpen" [title]="dnsForm.id ? 'Editar registo DNS' : 'Novo registo DNS'" [saving]="dnsSaving" (close)="dnsModalOpen=false" (save)="saveDns()">
      <div class="sig-modal-form sig-modal-grid">
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
  readonly statusOptions = [...DOMAIN_STATUSES];
  readonly statusFilterOpts = DOMAIN_STATUSES.map((v) => ({ value: v, label: v }));
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
    const status = normalizeDomainStatus(s);
    if (status === 'Ativo') return SigBadge.success;
    if (status === 'Expirando') return SigBadge.warning;
    if (status === 'Expirado') return SigBadge.danger;
    return SigBadge.neutral; // Não Renovado e demais
  }

  openNew() { this.form = { auto_renovacao: true, status: 'Ativo', custo_renovacao: 0 }; this.modalOpen = true; }
  openEdit(d: Domain) {
    this.form = {
      id: d.id,
      empresa_id: (d as any).empresa_id ?? null,
      nome: d.url,
      registrar: d.registrar,
      dns_provider: d.dnsProvider,
      data_vencimento: d.expirationDate,
      ssl_vencimento: d.sslExpiration,
      custo_renovacao: d.renewalCost,
      status: normalizeDomainStatus(d.status),
      auto_renovacao: d.autoRenew,
      observacoes: d.observacoes || '',
    };
    this.modalOpen = true;
  }
  async save() {
    if (!this.ux.require(this.form.nome, 'o domínio')) return;
    const payload = this.cleanDates({
      ...this.form,
      status: normalizeDomainStatus(this.form.status),
    });
    this.saving = true;
    try {
      const ok = await this.crud.upsert('dominios', payload);
      if (ok) this.modalOpen = false;
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

  exportICS() {
    const events: IcsEvent[] = [];
    for (const d of this.filtered) {
      if (d.expirationDate) {
        events.push({
          uid: `dominio-vencimento-${d.id}@sig-gestao-ti`,
          summary: `Domínio vence: ${d.url}`,
          date: d.expirationDate,
          description: [
            'Vencimento do domínio',
            d.registrar ? `Registrador: ${d.registrar}` : '',
            d.status ? `Status: ${d.status}` : '',
            d.autoRenew ? 'Renovação automática: Sim' : 'Renovação automática: Não',
          ].filter(Boolean).join('\n'),
          location: d.url || undefined,
        });
      }
      if (d.sslExpiration) {
        events.push({
          uid: `dominio-ssl-${d.id}@sig-gestao-ti`,
          summary: `SSL vence: ${d.url}`,
          date: d.sslExpiration,
          description: [
            'Vencimento do certificado SSL',
            d.registrar ? `Registrador: ${d.registrar}` : '',
            d.status ? `Status: ${d.status}` : '',
          ].filter(Boolean).join('\n'),
          location: d.url || undefined,
        });
      }
    }
    const count = exportToICS(events, 'dominios-vencimentos', 'SIG — Vencimentos de domínios');
    if (!count) this.ux.noCalendarEvents('domínios (vencimento ou SSL)');
    else this.ux.calendarExported(count);
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
      status: normalizeDomainStatus(r['Status'] || 'Ativo'),
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
