import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="app-modal-backdrop" (click)="onBackdrop($event)">
      <div class="app-modal-dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="app-modal-header">
          <h3 class="app-modal-title">{{ title }}</h3>
          <button type="button" class="btn-close" aria-label="Fechar" (click)="close.emit()"></button>
        </div>
        <div class="app-modal-body">
          <ng-content></ng-content>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="close.emit()">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="save.emit()" [disabled]="saving">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() saving = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  onBackdrop(_e: MouseEvent): void {
    this.close.emit();
  }
}

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="app-modal-backdrop">
      <div class="app-modal-dialog app-modal-dialog--sm" role="alertdialog" aria-modal="true">
        <div class="app-modal-header">
          <h3 class="app-modal-title">{{ title }}</h3>
        </div>
        <div class="app-modal-body">
          <p class="mb-0 text-secondary">{{ message }}</p>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancel.emit()">Cancelar</button>
          <button type="button" class="btn btn-danger btn-sm" (click)="confirm.emit()">Confirmar</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmComponent {
  @Input() open = false;
  @Input() title = 'Confirmar';
  @Input() message = 'Tem certeza?';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
