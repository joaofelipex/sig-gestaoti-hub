import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmpresaService, Empresa } from '../services/empresa.service';

@Component({
  selector: 'app-empresa-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex flex-column flex-sm-row align-items-sm-center gap-1 gap-sm-2">
      <label class="form-label mb-0 small text-muted text-uppercase">Empresa</label>
      <select
        [ngModel]="selectedId"
        (ngModelChange)="onChange($event)"
        class="form-select form-select-sm"
        style="min-width: 12rem; max-width: 20rem;"
      >
        <option [ngValue]="null">Todas as empresas</option>
        <option *ngFor="let e of empresas" [ngValue]="e.id">{{ e.nome }}</option>
      </select>
    </div>
  `,
})
export class EmpresaSelectorComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  selectedId: string | null = null;
  private subs: Subscription[] = [];

  constructor(private svc: EmpresaService) {}

  ngOnInit(): void {
    this.subs.push(this.svc.list$.subscribe((l) => (this.empresas = l)));
    this.subs.push(this.svc.selected$.subscribe((id) => (this.selectedId = id)));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  onChange(id: string | null): void {
    this.svc.setSelected(id);
  }
}
