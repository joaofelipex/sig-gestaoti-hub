import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
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
      <div *ngFor="let f of filters" class="sig-toolbar-filter" [class.is-open]="openFilterKey === f.key">
        <button
          type="button"
          class="sig-toolbar-filter__button"
          (click)="toggleFilter(f.key, $event)"
          [attr.aria-label]="f.label"
          [attr.aria-expanded]="openFilterKey === f.key"
          aria-haspopup="listbox"
        >
          <span class="sig-toolbar-filter__label">{{ f.label }}</span>
          <span class="sig-toolbar-filter__value">{{ selectedFilterLabel(f) }}</span>
        </button>
        <div *ngIf="openFilterKey === f.key" class="sig-toolbar-filter__menu" role="listbox" [attr.aria-label]="f.label">
          <button
            type="button"
            class="sig-toolbar-filter__option"
            [class.is-active]="!filterValues[f.key]"
            role="option"
            [attr.aria-selected]="!filterValues[f.key]"
            (click)="selectFilter(f.key, '', $event)"
          >
            Todos
          </button>
          <button
            *ngFor="let o of f.options"
            type="button"
            class="sig-toolbar-filter__option"
            [class.is-active]="filterValues[f.key] === o.value"
            role="option"
            [attr.aria-selected]="filterValues[f.key] === o.value"
            (click)="selectFilter(f.key, o.value, $event)"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
      <div class="sig-toolbar-actions ms-auto flex flex-wrap items-center gap-2">
        <input
          #importInput
          type="file"
          accept=".csv"
          class="sig-toolbar-file"
          (change)="onFileSelected($event)"
        />
        <button type="button" class="sig-toolbar-btn sig-toolbar-btn--ghost" (click)="importInput.click()">
          <i [class]="icons.import" aria-hidden="true"></i>
          Importar
        </button>
        <button type="button" class="sig-toolbar-btn sig-toolbar-btn--ghost" (click)="exportClick.emit()">
          <i [class]="icons.export" aria-hidden="true"></i>
          Exportar
        </button>
        <button *ngIf="showNew" type="button" class="sig-toolbar-btn sig-toolbar-btn--primary" (click)="newClick.emit()">
          <i [class]="icons.plus" aria-hidden="true"></i>
          Novo
        </button>
      </div>
    </div>
  `,
})
export class DataToolbarComponent {
  readonly icons = SigIcons;
  openFilterKey: string | null = null;

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

  selectedFilterLabel(filter: FilterDef) {
    const value = this.filterValues[filter.key] || '';
    return filter.options.find((o) => o.value === value)?.label || 'Todos';
  }

  toggleFilter(key: string, ev: MouseEvent) {
    ev.stopPropagation();
    this.openFilterKey = this.openFilterKey === key ? null : key;
  }

  selectFilter(key: string, value: string, ev: MouseEvent) {
    ev.stopPropagation();
    this.openFilterKey = null;
    this.onFilterChange(key, value);
  }

  @HostListener('document:click')
  closeFilters() {
    this.openFilterKey = null;
  }

  onFileSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) this.importFile.emit(file);
    (ev.target as HTMLInputElement).value = '';
  }
}
