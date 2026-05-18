import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SigIcons } from '../core/sig-icons';

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
    <div class="sig-toolbar-standalone flex flex-wrap items-center gap-3" role="toolbar">
      <div class="sig-toolbar-search relative min-w-[200px] flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          <i [class]="icons.search"></i>
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
      <div class="sig-toolbar-actions ms-auto flex flex-wrap items-center gap-2">
        <label class="app-btn-ghost mb-0 cursor-pointer gap-1.5">
          <i [class]="icons.import" aria-hidden="true"></i>
          Importar
          <input type="file" accept=".csv" class="hidden" (change)="onFileSelected($event)" />
        </label>
        <button type="button" class="app-btn-ghost gap-1.5" (click)="exportClick.emit()">
          <i [class]="icons.export" aria-hidden="true"></i>
          Exportar
        </button>
        <button *ngIf="showNew" type="button" class="btn btn-primary btn-sm gap-1.5" (click)="newClick.emit()">
          <i [class]="icons.plus" aria-hidden="true"></i>
          Novo
        </button>
      </div>
    </div>
  `,
})
export class DataToolbarComponent {
  readonly icons = SigIcons;

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
