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
    <div class="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div class="relative flex-1 min-w-[200px]">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          [ngModel]="search"
          (ngModelChange)="searchChange.emit($event)"
          [placeholder]="searchPlaceholder"
          class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <select
        *ngFor="let f of filters"
        [ngModel]="filterValues[f.key] || ''"
        (ngModelChange)="onFilterChange(f.key, $event)"
        class="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{{ f.label }}: Todos</option>
        <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
      </select>
      <div class="flex items-center gap-2 ml-auto">
        <label class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm cursor-pointer flex items-center gap-1">
          📥 Importar
          <input type="file" accept=".csv" class="hidden" (change)="onFileSelected($event)" />
        </label>
        <button (click)="exportClick.emit()" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm flex items-center gap-1">
          📤 Exportar
        </button>
        <button *ngIf="showNew" (click)="newClick.emit()" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-1">
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
