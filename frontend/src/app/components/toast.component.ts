import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <div
        *ngFor="let toast of toasts"
        class="bg-white border rounded-md shadow-lg p-4 max-w-sm"
        [class]="toast.variant === 'destructive' ? 'border-red-500' : 'border-gray-300'"
      >
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-semibold">{{ toast.title }}</h4>
            <p *ngIf="toast.description" class="text-sm text-gray-600">{{ toast.description }}</p>
          </div>
          <button (click)="removeToast(toast.id)" class="ml-4 text-gray-400 hover:text-gray-600">×</button>
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