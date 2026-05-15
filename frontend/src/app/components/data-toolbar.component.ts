import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

@Component({
  selector: 'app-data-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div class="relative min-w-[200px] flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          [ngModel]="search"
          (ngModelChange)="searchChange.emit($event)"
          [placeholder]="searchPlaceholder"
          class="app-field pl-9"
        />
      </div>
      <select
        *ngFor="let f of filters"
        [ngModel]="filterValues[f.key] || ''"
        (ngModelChange)="onFilterChange(f.key, $event)"
        class="app-field w-auto min-w-[140px] py-2"
      >
        <option value="">{{ f.label }}: Todos</option>
        <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
      </select>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <label class="app-btn-ghost cursor-pointer gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
          Importar
          <input type="file" accept=".csv" class="hidden" (change)="onFileSelected($event)" />
        </label>
        <button type="button" (click)="exportClick.emit()" class="app-btn-ghost rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
          Exportar
        </button>
        <button
          *ngIf="showNew"
          type="button"
          (click)="newClick.emit()"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          + Novo
        </button>
      </div>
    </div>
  `
})
export class DataToolbarComponent {
  @Input() search = '';
  @Input() searchPlaceholder = 'Buscar...';
  @Input() filters: FilterDef[] = [];
  @Input() filterValues: Record<string, string> = {};
  @Input() showNew = true;
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();
  @Output() newClick = new EventEmitter<void>();
  @Output() exportClick = new EventEmitter<void>();
  @Output() importFile = new EventEmitter<File>();

  onFilterChange(key: string, value: string) {
    this.filterChange.emit({ key, value });
  }

  onFileSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) this.importFile.emit(file);
    (ev.target as HTMLInputElement).value = '';
  }
}
