import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmpresaService, Empresa } from '../../services/empresa.service';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ConfirmComponent],
  template: `
    <div class="p-3 p-md-4">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Empresas da Holding</h1>
          <p class="app-page-sub">Gerencie as empresas que compõem a IMTS — cada registro de TI pode ser segmentado por empresa.</p>
        </div>
        <button type="button" (click)="openNew()" class="btn btn-primary btn-sm">+ Nova Empresa</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let e of empresas"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          [class.ring-2]="selectedId === e.id" [class.ring-blue-500]="selectedId === e.id">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
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
            <button (click)="select(e)" class="text-xs font-medium text-blue-600 hover:underline">
              {{ selectedId === e.id ? '✓ Selecionada' : 'Filtrar por esta' }}
            </button>
            <div class="flex gap-2">
              <button (click)="openEdit(e)" class="text-xs text-gray-600 hover:text-gray-900">Editar</button>
              <button (click)="askDelete(e)" class="text-xs text-red-600 hover:text-red-800">Excluir</button>
            </div>
          </div>
        </div>
        <div *ngIf="!empresas.length" class="col-span-full text-center py-12 text-gray-400">
          Nenhuma empresa cadastrada
        </div>
      </div>
    </div>

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
    <app-confirm [open]="confirmOpen" title="Excluir empresa" [message]="'Excluir ' + (toDelete?.nome || '?') + '? Os registros vinculados não serão removidos.'" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class EmpresasComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  selectedId: string | null = null;
  modalOpen = false; confirmOpen = false; saving = false;
  form: any = {}; toDelete: Empresa | null = null;
  private subs: Subscription[] = [];
  constructor(private svc: EmpresaService) {}
  ngOnInit() {
    this.subs.push(this.svc.list$.subscribe(l => this.empresas = l));
    this.subs.push(this.svc.selected$.subscribe(id => this.selectedId = id));
  }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }
  initials(n: string) { return n.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }
  select(e: Empresa) { this.svc.setSelected(this.selectedId === e.id ? null : e.id); }
  openNew() { this.form = { ativo: true }; this.modalOpen = true; }
  openEdit(e: Empresa) { this.form = { ...e }; this.modalOpen = true; }
  async save() {
    if (!this.form.nome) return;
    this.saving = true;
    const ok = await this.svc.upsert(this.form);
    this.saving = false;
    if (ok) this.modalOpen = false;
  }
  askDelete(e: Empresa) { this.toDelete = e; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.svc.remove(this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
}
