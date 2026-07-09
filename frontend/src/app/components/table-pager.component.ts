import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SigIcons } from '../core/sig-icons';

@Component({
  selector: 'app-table-pager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="sig-list-footer" *ngIf="total > 0" aria-label="Paginação da listagem">
      <p class="sig-list-footer__meta">
        Exibindo <strong>{{ from }}</strong>–<strong>{{ to }}</strong> de <strong>{{ total }}</strong>
      </p>

      <div class="sig-list-footer__actions">
        <div class="sig-toolbar-filter sig-list-footer__size" [class.is-open]="sizeOpen">
          <button
            type="button"
            class="sig-toolbar-filter__button"
            (click)="toggleSizeMenu($event)"
            aria-haspopup="listbox"
            [attr.aria-expanded]="sizeOpen"
            aria-label="Quantidade por página"
          >
            <span class="sig-toolbar-filter__label">Mostrar</span>
            <span class="sig-toolbar-filter__value">{{ pageSizeLabel }}</span>
          </button>
          <div
            *ngIf="sizeOpen"
            class="sig-toolbar-filter__menu"
            role="listbox"
            aria-label="Quantidade por página"
          >
            <button
              *ngFor="let size of pageSizeOptions"
              type="button"
              class="sig-toolbar-filter__option"
              role="option"
              [class.is-active]="pageSize === size"
              [attr.aria-selected]="pageSize === size"
              (click)="selectPageSize(size, $event)"
            >
              {{ size === 0 ? 'Todos' : size + ' por página' }}
            </button>
          </div>
        </div>

        <nav
          *ngIf="pageSize > 0 && totalPages > 1"
          class="sig-list-footer__nav"
          aria-label="Navegação de páginas"
        >
          <button
            type="button"
            class="sig-toolbar-btn sig-toolbar-btn--ghost"
            (click)="go(pageIndex - 1)"
            [disabled]="pageIndex <= 0"
            aria-label="Página anterior"
          >
            <i [class]="icons.chevronLeft" aria-hidden="true"></i>
            Anterior
          </button>
          <span class="sig-filter-chip sig-list-footer__page">{{ pageIndex + 1 }} / {{ totalPages }}</span>
          <button
            type="button"
            class="sig-toolbar-btn sig-toolbar-btn--ghost"
            (click)="go(pageIndex + 1)"
            [disabled]="pageIndex >= totalPages - 1"
            aria-label="Próxima página"
          >
            Próxima
            <i [class]="icons.chevronRight" aria-hidden="true"></i>
          </button>
        </nav>
      </div>
    </footer>
  `,
})
export class TablePagerComponent {
  readonly icons = SigIcons;
  sizeOpen = false;

  @Input() total = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 25;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100, 0];

  @Output() pageIndexChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get pageSizeLabel(): string {
    return this.pageSize === 0 ? 'Todos' : String(this.pageSize);
  }

  get totalPages(): number {
    if (!this.pageSize) return 1;
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get from(): number {
    if (!this.total) return 0;
    if (!this.pageSize) return 1;
    return this.pageIndex * this.pageSize + 1;
  }

  get to(): number {
    if (!this.total) return 0;
    if (!this.pageSize) return this.total;
    return Math.min(this.total, (this.pageIndex + 1) * this.pageSize);
  }

  toggleSizeMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.sizeOpen = !this.sizeOpen;
  }

  selectPageSize(size: number, ev: MouseEvent): void {
    ev.stopPropagation();
    this.sizeOpen = false;
    if (size !== this.pageSize) this.pageSizeChange.emit(size);
  }

  go(index: number): void {
    const next = Math.max(0, Math.min(index, this.totalPages - 1));
    if (next !== this.pageIndex) this.pageIndexChange.emit(next);
  }

  @HostListener('document:click')
  closeSizeMenu(): void {
    this.sizeOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeSizeMenuByKeyboard(): void {
    this.sizeOpen = false;
  }
}
