import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, License } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { DateInputComponent } from '../../components/date-input.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { exportToICS, IcsEvent } from '../../utils/ics.util';

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, DateInputComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Licenças (SAM)</h1>
          <p class="app-page-sub">Software, assentos e conformidade de licenciamento.</p>
        </div>
      </header>

      <app-data-toolbar
        searchPlaceholder="Buscar software, fornecedor..."
        [search]="search"
        [filters]="[{key:'tipo',label:'Tipo',options:[{value:'Mensal',label:'Mensal'},{value:'Anual',label:'Anual'}]},{key:'categoria',label:'Categoria',options:catOpts}]"
        [filterValues]="filterValues"
        [showCalendarExport]="true"
        (searchChange)="search=$event"
        (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (calendarClick)="exportICS()" (importFile)="importCSV($event)"
      ></app-data-toolbar>

      <div *ngIf="loading" class="sig-page-loading">Carregando…</div>
      <div *ngIf="!loading" class="sig-list-card">
        <div class="sig-table-wrap">
        <table class="sig-table">
          <thead><tr>
            <th>Software</th><th>Fornecedor</th><th>Tipo</th><th>Categoria</th><th>Total</th><th>Em Uso</th><th>Custo</th><th>Renovação</th>
            <th class="text-end">Ações</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let l of filtered">
              <td class="fw-medium">{{ l.software }}</td>
              <td>{{ l.vendor }}</td><td>{{ l.type }}</td><td>{{ l.category }}</td>
              <td>{{ l.totalLicenses }}</td><td>{{ l.usedLicenses }}</td>
              <td>R$ {{ l.costPerUnit.toLocaleString('pt-BR') }}</td>
              <td>{{ l.renewalDate ? (l.renewalDate | date:'dd/MM/yyyy') : '—' }}</td>
              <td class="text-end">
                <div class="sig-row-actions">
                  <button type="button" (click)="openEdit(l)" class="sig-link-action" title="Editar">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" (click)="askDelete(l)" class="sig-link-action sig-link-action--danger" title="Excluir">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="9" class="sig-table-empty">Nenhuma licença</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Licença' : 'Nova Licença'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="md:col-span-2 text-sm">Software *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
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
        <label class="text-sm">Renovação<app-date-input [(ngModel)]="form.data_renovacao" ariaLabel="Renovação"></app-date-input></label>
        <label class="md:col-span-2 text-sm">Chave de Ativação<input [(ngModel)]="form.chave_ativacao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
      </div>
    </app-modal>

    <app-confirm [open]="confirmOpen" title="Excluir licença" [message]="'Excluir ' + (toDelete?.software || '?')" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class LicensesComponent implements OnInit, OnDestroy {
  licenses: License[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; deleting = false; form: any = {}; toDelete: License | null = null;
  catOpts = ['Produtividade','Design','Desenvolvimento','Segurança','Comunicação','Outros'].map(v=>({value:v,label:v}));
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
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
  openEdit(l: License) {
    this.form = {
      id: l.id,
      empresa_id: (l as any).empresa_id ?? null,
      nome: l.software,
      fornecedor: l.vendor,
      tipo: l.type,
      categoria: l.category,
      total_licencas: l.totalLicenses,
      qtd_usuarios: l.usedLicenses,
      custo_unitario: l.costPerUnit,
      chave_ativacao: l.activationKey,
      data_renovacao: l.renewalDate,
    };
    this.modalOpen = true;
  }
  async save() { if (!this.ux.require(this.form.nome, 'o software')) return; this.saving = true; try { const o = { ...this.form }; if (!o.data_renovacao) o.data_renovacao = null; const ok = await this.crud.upsert('licencas', o); if (ok) this.modalOpen = false; } finally { this.saving = false; } }
  askDelete(l: License) { this.toDelete = l; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.crud.remove('licencas', this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
  exportCSV() { exportToCSV(this.filtered.map(l => ({ Software: l.software, Fornecedor: l.vendor, Tipo: l.type, Categoria: l.category, Total: l.totalLicenses, EmUso: l.usedLicenses, Custo: l.costPerUnit, Renovacao: l.renewalDate })), 'licencas'); }
  exportICS() {
    const events: IcsEvent[] = this.filtered
      .filter((l) => !!l.renewalDate)
      .map((l) => ({
        uid: `licenca-${l.id}@sig-gestao-ti`,
        summary: `Renovação: ${l.software}`,
        date: l.renewalDate,
        description: [
          `Licença ${l.type || ''}`.trim(),
          l.vendor ? `Fornecedor: ${l.vendor}` : '',
          l.category ? `Categoria: ${l.category}` : '',
          `Assentos: ${l.usedLicenses}/${l.totalLicenses}`,
        ].filter(Boolean).join('\n'),
      }));
    const count = exportToICS(events, 'licencas-renovacoes', 'SIG — Renovações de licenças');
    if (!count) this.ux.noCalendarEvents('licenças');
    else this.ux.calendarExported(count);
  }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Software']||r['nome'], fornecedor: r['Fornecedor']||null, tipo: r['Tipo']||'Mensal', categoria: r['Categoria']||'Produtividade', total_licencas: Number(r['Total']||1), qtd_usuarios: Number(r['EmUso']||0), custo_unitario: Number(r['Custo']||0), data_renovacao: r['Renovacao']||null })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('licencas', payload);
    else this.ux.noImportRows('licenças');
  }
}
