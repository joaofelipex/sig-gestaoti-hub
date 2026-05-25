import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page p-3 p-md-4">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Empresas da Holding</h1>
          <p class="app-page-sub">{{ loading ? 'Carregando…' : empresas.length + ' empresa(s) únicas' }}</p>
        </div>
        <button type="button" (click)="openNew()" class="btn btn-primary btn-sm">+ Nova Empresa</button>
      </div>

      <div *ngIf="loading" class="sig-page-loading">Carregando empresas…</div>

      <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <article *ngFor="let e of empresas; trackBy: trackById"
          class="sig-empresa-card"
          [class.is-selected]="selectedId === e.id">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="sig-empresa-avatar">
                {{ initials(e.nome) }}
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm">{{ e.nome }}</h3>
                <p class="text-xs text-gray-500">{{ e.cnpj || 'CNPJ não informado' }}</p>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full" [class]="e.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
              {{ e.ativo ? 'Ativa' : 'Inativa' }}
            </span>
          </div>
          <div class="text-xs text-gray-600 space-y-1 mb-3">
            <div *ngIf="e.segmento"><span class="text-gray-400">Segmento:</span> {{ e.segmento }}</div>
            <div *ngIf="e.responsavel"><span class="text-gray-400">Responsável:</span> {{ e.responsavel }}</div>
          </div>
          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <button type="button" (click)="select(e)" class="sig-link-action text-xs">
              <i class="fas" [class.fa-check-circle]="selectedId === e.id" [class.fa-filter]="selectedId !== e.id" aria-hidden="true"></i>
              {{ selectedId === e.id ? 'Selecionada' : 'Filtrar por esta' }}
            </button>
            <div class="flex gap-2">
              <button type="button" (click)="openEdit(e)" class="sig-icon-btn" title="Editar">
                <i class="fas fa-pen" aria-hidden="true"></i>
              </button>
              <button type="button" (click)="askDelete(e)" class="sig-icon-btn sig-icon-btn--danger" title="Excluir">
                <i class="fas fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
        <div *ngIf="!empresas.length" class="col-span-full sig-table-empty">
          Nenhuma empresa cadastrada
        </div>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Empresa' : 'Nova Empresa'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">CNPJ<input [(ngModel)]="form.cnpj" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="00.000.000/0000-00"/></label>
        <label class="text-sm">Segmento<input [(ngModel)]="form.segmento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="Tecnologia, Saúde..."/></label>
        <label class="text-sm">Responsável<input [(ngModel)]="form.responsavel" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Status
          <select [(ngModel)]="form.ativo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm">
            <option [ngValue]="true">Ativa</option>
            <option [ngValue]="false">Inativa</option>
          </select>
        </label>
        <label class="col-span-2 text-sm">Observações<textarea [(ngModel)]="form.observacoes" rows="2" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir empresa" [message]="'Excluir ' + (toDelete?.nome || '?') + '? Os registros vinculados não serão removidos.'" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class EmpresasComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  loading = true;
  selectedId: string | null = null;
  modalOpen = false; confirmOpen = false; saving = false; deleting = false;
  form: any = {}; toDelete: Empresa | null = null;
  private subs: Subscription[] = [];
  constructor(private svc: EmpresaService, private ux: UxFeedbackService) {}
  ngOnInit() {
    this.subs.push(this.svc.list$.subscribe(l => this.empresas = l));
    this.subs.push(this.svc.loading$.subscribe(v => this.loading = v));
    this.subs.push(this.svc.selected$.subscribe(id => this.selectedId = id));
    void this.svc.load();
  }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }
  trackById(_: number, e: Empresa) { return e.id; }
  initials(n: string) { return n.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }
  select(e: Empresa) { this.svc.setSelected(this.selectedId === e.id ? null : e.id); }
  openNew() { this.form = { ativo: true }; this.modalOpen = true; }
  openEdit(e: Empresa) { this.form = { ...e }; this.modalOpen = true; }
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
  askDelete(e: Empresa) { this.toDelete = e; this.confirmOpen = true; }
  async doDelete() { if (!this.toDelete || this.deleting) return; this.deleting = true; const ok = await this.svc.remove(this.toDelete.id); this.deleting = false; if (ok) { this.confirmOpen = false; this.toDelete = null; } }
}
