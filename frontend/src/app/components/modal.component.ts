import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="rendered"
      class="app-modal-backdrop"
      [class.is-leaving]="leaving"
      role="presentation"
    >
      <div
        #dialog
        class="app-modal-dialog"
        [class.is-leaving]="leaving"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div class="app-modal-header">
          <h3 class="app-modal-title" [id]="titleId">{{ title }}</h3>
          <button
            type="button"
            class="app-modal-close"
            aria-label="Fechar"
            (click)="requestClose()"
            [disabled]="saving"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div class="app-modal-body">
          <ng-content></ng-content>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="requestClose()" [disabled]="saving">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary btn-sm app-modal-primary" (click)="requestSave()" [disabled]="saving">
            <span *ngIf="saving" class="app-modal-spinner" aria-hidden="true"></span>
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent implements OnDestroy {
  @Input() title = '';
  @Input() saving = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;

  rendered = false;
  leaving = false;
  readonly titleId = `app-modal-title-${Math.random().toString(36).slice(2, 9)}`;

  private leaveTimer: ReturnType<typeof setTimeout> | null = null;
  private bodyLocked = false;

  @Input()
  set open(value: boolean) {
    if (value) this.openNow();
    else this.closeAnimated();
  }
  get open(): boolean {
    return this.rendered && !this.leaving;
  }

  ngOnDestroy(): void {
    this.clearLeaveTimer();
    this.unlockBody();
  }

  requestClose(): void {
    if (!this.saving) this.close.emit();
  }

  requestSave(): void {
    if (!this.saving) this.save.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // Só Esc / Cancelar / X — clique no fundo NÃO fecha (evita perder formulário a meio)
    if (this.rendered && !this.leaving && !this.saving) this.requestClose();
  }

  private openNow(): void {
    this.clearLeaveTimer();
    this.leaving = false;
    this.rendered = true;
    this.lockBody();
    queueMicrotask(() => {
      const el = this.dialogRef?.nativeElement?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([disabled])',
      );
      el?.focus();
    });
  }

  private closeAnimated(): void {
    if (!this.rendered) return;
    if (this.leaving) return;
    this.leaving = true;
    this.clearLeaveTimer();
    this.leaveTimer = setTimeout(() => {
      this.rendered = false;
      this.leaving = false;
      this.unlockBody();
      this.leaveTimer = null;
    }, 160);
  }

  private clearLeaveTimer(): void {
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
  }

  private lockBody(): void {
    if (typeof document === 'undefined' || this.bodyLocked) return;
    document.body.style.overflow = 'hidden';
    this.bodyLocked = true;
  }

  private unlockBody(): void {
    if (typeof document === 'undefined' || !this.bodyLocked) return;
    document.body.style.overflow = '';
    this.bodyLocked = false;
  }
}

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="rendered"
      class="app-modal-backdrop"
      [class.is-leaving]="leaving"
      (mousedown)="onBackdropPointer($event)"
      (click)="onBackdropClick($event)"
      role="presentation"
    >
      <div
        class="app-modal-dialog app-modal-dialog--sm app-modal-dialog--confirm"
        [class.is-leaving]="leaving"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div class="app-modal-confirm-icon" aria-hidden="true">
          <i class="fas fa-exclamation"></i>
        </div>
        <div class="app-modal-header app-modal-header--confirm">
          <h3 class="app-modal-title" [id]="titleId">{{ title }}</h3>
        </div>
        <div class="app-modal-body">
          <p class="app-modal-confirm-msg">{{ message }}</p>
        </div>
        <div class="app-modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="requestCancel()" [disabled]="confirming">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger btn-sm app-modal-primary" (click)="requestConfirm()" [disabled]="confirming">
            <span *ngIf="confirming" class="app-modal-spinner app-modal-spinner--light" aria-hidden="true"></span>
            {{ confirming ? 'Confirmando…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmComponent implements OnDestroy {
  @Input() title = 'Confirmar';
  @Input() message = 'Tem certeza?';
  @Input() confirming = false;
  @Input() confirmLabel = 'Confirmar';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  rendered = false;
  leaving = false;
  readonly titleId = `app-confirm-title-${Math.random().toString(36).slice(2, 9)}`;

  private leaveTimer: ReturnType<typeof setTimeout> | null = null;
  private bodyLocked = false;
  private backdropPress = false;

  @Input()
  set open(value: boolean) {
    if (value) this.openNow();
    else this.closeAnimated();
  }
  get open(): boolean {
    return this.rendered && !this.leaving;
  }

  ngOnDestroy(): void {
    this.clearLeaveTimer();
    this.unlockBody();
  }

  requestConfirm(): void {
    if (!this.confirming) this.confirm.emit();
  }

  requestCancel(): void {
    if (!this.confirming) this.cancel.emit();
  }

  onBackdropPointer(event: MouseEvent): void {
    this.backdropPress = event.target === event.currentTarget;
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.backdropPress && event.target === event.currentTarget) {
      this.requestCancel();
    }
    this.backdropPress = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.rendered && !this.leaving && !this.confirming) this.requestCancel();
  }

  private openNow(): void {
    this.clearLeaveTimer();
    this.leaving = false;
    this.rendered = true;
    this.lockBody();
  }

  private closeAnimated(): void {
    if (!this.rendered) return;
    if (this.leaving) return;
    this.leaving = true;
    this.clearLeaveTimer();
    this.leaveTimer = setTimeout(() => {
      this.rendered = false;
      this.leaving = false;
      this.unlockBody();
      this.leaveTimer = null;
    }, 160);
  }

  private clearLeaveTimer(): void {
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
  }

  private lockBody(): void {
    if (typeof document === 'undefined' || this.bodyLocked) return;
    document.body.style.overflow = 'hidden';
    this.bodyLocked = true;
  }

  private unlockBody(): void {
    if (typeof document === 'undefined' || !this.bodyLocked) return;
    document.body.style.overflow = '';
    this.bodyLocked = false;
  }
}
