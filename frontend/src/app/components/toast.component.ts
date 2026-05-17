import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-toast-host" aria-live="polite">
      <div
        *ngFor="let toast of toasts"
        class="app-toast"
        [class.app-toast--error]="toast.variant === 'destructive'"
        role="alert"
      >
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="app-toast__title">{{ toast.title }}</div>
            <p *ngIf="toast.description" class="app-toast__body mb-0">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            class="btn-close btn-close-sm"
            aria-label="Fechar"
            (click)="removeToast(toast.id)"
          ></button>
        </div>
      </div>
    </div>
  `,
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe((t) => (this.toasts = t));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }
}
