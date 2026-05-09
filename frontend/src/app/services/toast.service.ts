import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = new BehaviorSubject<Toast[]>([]);
  public readonly toasts$ = this._toasts.asObservable();

  show(toast: Omit<Toast, 'id'>) {
    const newToast: Toast = {
      id: Date.now().toString(),
      ...toast
    };
    const current = this._toasts.value;
    this._toasts.next([...current, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this.remove(newToast.id);
    }, 5000);
  }

  remove(id: string) {
    const current = this._toasts.value;
    this._toasts.next(current.filter(t => t.id !== id));
  }
}