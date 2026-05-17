import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/** Feedback visual — sem alterar chamadas nos serviços existentes. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  show(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...toast,
    };
    this._toasts.next([...this._toasts.value, newToast]);
    setTimeout(() => this.remove(newToast.id), 5000);
  }

  remove(id: string): void {
    this._toasts.next(this._toasts.value.filter((t) => t.id !== id));
  }
}
