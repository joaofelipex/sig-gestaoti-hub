import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigBadge } from '../../utils/status-badge';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Empresas da Holding</h1>
          <p class="app-page-sub">Cadastro e seleção de empresas do grupo.</p>
        </div>
      </header>

      <app-data-toolbar
        searchPlaceholder="Buscar nome, CNPJ, segmento..."
        [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}]"
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
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Segmento</th>
                <th>Responsável</th>
                <th>Status</th>
                <th class="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of filtered; trackBy: trackById" [class.sig-row-selected]="selectedId === e.id">
                <td class="fw-medium">{{ e.nome }}</td>
                <td>{{ e.cnpj || '—' }}</td>
                <td>{{ e.segmento || '—' }}</td>
                <td>{{ e.responsavel || '—' }}</td>
                <td><span [class]="statusClass(e)">{{ e.ativo ? 'Ativa' : 'Inativa' }}</span></td>
                <td class="text-end">
                  <div class="sig-row-actions">
                    <button type="button" (click)="select(e)" class="sig-link-action" [title]="selectedId === e.id ? 'Selecionada' : 'Filtrar'">
                      <i class="fas fa-filter" aria-hidden="true"></i>
                      <span>{{ selectedId === e.id ? 'Selecionada' : 'Filtrar' }}</span>
                    </button>
                    <button type="button" (click)="openEdit(e)" class="sig-link-action" title="Editar">
                      <i class="fas fa-pen" aria-hidden="true"></i>
                      <span>Editar</span>
                    </button>
                    <button type="button" (click)="askDelete(e)" class="sig-link-action sig-link-action--danger" title="Excluir">
                      <i class="fas fa-trash-alt" aria-hidden="true"></i>
                      <span>Excluir</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!filtered.length"><td colspan="6" class="sig-table-empty">Nenhuma empresa</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Empresa' : 'Nova Empresa'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="sig-modal-form sig-modal-grid">
        <label class="md:col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">CNPJ<input [(ngModel)]="form.cnpj" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="00.000.000/0000-00"/></label>
        <label class="text-sm">Segmento<input [(ngModel)]="form.segmento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="Tecnologia, Saúde..."/></label>
        <label class="text-sm">Responsável<input [(ngModel)]="form.responsavel" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.ativo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option [ngValue]="true">Ativa</option>
            <option [ngValue]="false">Inativa</option>
          </select>
        </label>
        <label class="md:col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir empresa" [message]="'Excluir ' + (toDelete?.nome || '?') + '? Os registros vinculados não serão removidos.'" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class EmpresasComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  loading = true;
  search = '';
  filterValues: Record<string, string> = {};
  selectedId: string | null = null;
  modalOpen = false;
  confirmOpen = false;
  saving = false;
  deleting = false;
  form: any = {};
  toDelete: Empresa | null = null;
  private subs: Subscription[] = [];

  constructor(private svc: EmpresaService, private ux: UxFeedbackService) {}

  ngOnInit() {
    this.subs.push(this.svc.list$.subscribe((l) => (this.empresas = l)));
    this.subs.push(this.svc.loading$.subscribe((v) => (this.loading = v)));
    this.subs.push(this.svc.selected$.subscribe((id) => (this.selectedId = id)));
    void this.svc.load();
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  get filtered() {
    const q = this.search.toLowerCase();
    return this.empresas.filter((e) => {
      const matchesSearch =
        !q ||
        e.nome?.toLowerCase().includes(q) ||
        e.cnpj?.toLowerCase().includes(q) ||
        e.segmento?.toLowerCase().includes(q) ||
        e.responsavel?.toLowerCase().includes(q);
      const matchesStatus =
        !this.filterValues['status'] ||
        (this.filterValues['status'] === 'ativa' && e.ativo) ||
        (this.filterValues['status'] === 'inativa' && !e.ativo);
      return matchesSearch && matchesStatus;
    });
  }

  trackById(_: number, e: Empresa) {
    return e.id;
  }

  statusClass(e: Empresa) {
    return e.ativo ? SigBadge.success : SigBadge.neutral;
  }

  select(e: Empresa) {
    this.svc.setSelected(this.selectedId === e.id ? null : e.id);
  }

  openNew() {
    this.form = { ativo: true };
    this.modalOpen = true;
  }

  openEdit(e: Empresa) {
    this.form = { ...e };
    this.modalOpen = true;
  }

  async save() {
    if (!this.ux.require(this.form.nome, 'o nome da empresa')) return;
    this.saving = true;
    try {
      const ok = await this.svc.upsert(this.form);
      if (ok) this.modalOpen = false;
    } finally {
      this.saving = false;
    }
  }

  askDelete(e: Empresa) {
    this.toDelete = e;
    this.confirmOpen = true;
  }

  async doDelete() {
    if (!this.toDelete || this.deleting) return;
    this.deleting = true;
    const ok = await this.svc.remove(this.toDelete.id);
    this.deleting = false;
    if (ok) {
      this.confirmOpen = false;
      this.toDelete = null;
    }
  }

  exportCSV() {
    exportToCSV(
      this.filtered.map((e) => ({
        Nome: e.nome,
        CNPJ: e.cnpj,
        Segmento: e.segmento,
        Responsavel: e.responsavel,
        Status: e.ativo ? 'Ativa' : 'Inativa',
        Observacoes: e.observacoes,
      })),
      'empresas',
    );
  }

  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    let imported = 0;
    for (const r of rows) {
      const nome = r['Nome'] || r['nome'];
      if (!nome) continue;
      const ok = await this.svc.upsert({
        nome,
        cnpj: r['CNPJ'] || r['cnpj'] || null,
        segmento: r['Segmento'] || r['segmento'] || null,
        responsavel: r['Responsavel'] || r['Responsável'] || r['responsavel'] || null,
        ativo: String(r['Status'] || 'Ativa').toLowerCase().startsWith('a'),
        observacoes: r['Observacoes'] || r['Observações'] || null,
      });
      if (ok) imported++;
    }
    if (!imported) this.ux.noImportRows('empresas');
  }
}
