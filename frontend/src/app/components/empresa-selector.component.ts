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
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa</span>
      <select
        [ngModel]="selectedId"
        (ngModelChange)="onChange($event)"
        class="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      >
        <option [ngValue]="null">🏢 Todas as empresas</option>
        <option *ngFor="let e of empresas" [ngValue]="e.id">{{ e.nome }}</option>
      </select>
    </div>
  `
})
export class EmpresaSelectorComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  selectedId: string | null = null;
  private subs: Subscription[] = [];
  constructor(private svc: EmpresaService) {}
  ngOnInit() {
    this.subs.push(this.svc.list$.subscribe(l => this.empresas = l));
    this.subs.push(this.svc.selected$.subscribe(id => this.selectedId = id));
  }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }
  onChange(id: string | null) { this.svc.setSelected(id); }
}
