import { ApplicationRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
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
        *ngFor="let toast of toasts; trackBy: trackToast"
        class="app-toast"
        [class.app-toast--error]="toast.variant === 'destructive'"
        [class.app-toast--success]="toast.variant !== 'destructive'"
        role="alert"
      >
        <div class="app-toast__icon" aria-hidden="true">
          <i class="fas" [class.fa-check]="toast.variant !== 'destructive'" [class.fa-exclamation]="toast.variant === 'destructive'"></i>
        </div>
        <div class="app-toast__content">
          <div class="app-toast__title">{{ toast.title }}</div>
          <p *ngIf="toast.description" class="app-toast__body mb-0">{{ toast.description }}</p>
        </div>
        <button
          type="button"
          class="app-toast__close"
          aria-label="Fechar"
          (click)="removeToast(toast.id)"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(
    private toastService: ToastService,
    private appRef: ApplicationRef,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe((t) => {
      this.toasts = t;
      this.zone.run(() => {
        try {
          this.appRef.tick();
        } catch {
          /* ignore */
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  trackToast(_i: number, toast: Toast): string {
    return toast.id;
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }
}
