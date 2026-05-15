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
    <div class="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Empresa ativa</span>
      <div class="relative">
        <select
          [ngModel]="selectedId"
          (ngModelChange)="onChange($event)"
          class="app-select min-w-[12rem] max-w-[20rem] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option [ngValue]="null">Todas as empresas</option>
          <option *ngFor="let e of empresas" [ngValue]="e.id">{{ e.nome }}</option>
        </select>
        <span
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .app-select {
        background-image: none;
      }
    `
  ]
})
export class EmpresaSelectorComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  selectedId: string | null = null;
  private subs: Subscription[] = [];
  constructor(private svc: EmpresaService) {}
  ngOnInit() {
    this.subs.push(this.svc.list$.subscribe(l => (this.empresas = l)));
    this.subs.push(this.svc.selected$.subscribe(id => (this.selectedId = id)));
  }
  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
  onChange(id: string | null) {
    this.svc.setSelected(id);
  }
}
