import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="app-modal-backdrop">
      <div class="app-modal-dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="app-modal-header">
          <h3 class="app-modal-title">{{ title }}</h3>
          <button type="button" class="btn-close" aria-label="Fechar" (click)="requestClose()" [disabled]="saving"></button>
        </div>
        <div class="app-modal-body">
          <ng-content></ng-content>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="requestClose()" [disabled]="saving">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="requestSave()" [disabled]="saving">
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

  requestClose(): void {
    if (!this.saving) this.close.emit();
  }

  requestSave(): void {
    if (!this.saving) this.save.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.requestClose();
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
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="requestCancel()" [disabled]="confirming">Cancelar</button>
          <button type="button" class="btn btn-danger btn-sm" (click)="requestConfirm()" [disabled]="confirming">
            {{ confirming ? 'Confirmando...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmComponent {
  @Input() open = false;
  @Input() title = 'Confirmar';
  @Input() message = 'Tem certeza?';
  @Input() confirming = false;
  @Input() confirmLabel = 'Confirmar';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  requestConfirm(): void {
    if (!this.confirming) this.confirm.emit();
  }

  requestCancel(): void {
    if (!this.confirming) this.cancel.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.requestCancel();
  }
}
