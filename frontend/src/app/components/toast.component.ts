import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 top-4 z-50 space-y-2">
      <div
        *ngFor="let toast of toasts"
        class="max-w-sm rounded-md border p-4 shadow-lg"
        [ngClass]="
          toast.variant === 'destructive'
            ? 'border-red-200 bg-red-50 text-red-950'
            : 'border-gray-200 bg-white text-gray-900 shadow-gray-900/10'
        "
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h4 class="font-semibold leading-tight">{{ toast.title }}</h4>
            <p *ngIf="toast.description" class="mt-1 text-sm opacity-90">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            (click)="removeToast(toast.id)"
            class="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  removeToast(id: string) {
    this.toastService.remove(id);
  }
}