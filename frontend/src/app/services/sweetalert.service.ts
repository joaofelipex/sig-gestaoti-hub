import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class SweetAlertService {
  success(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({ icon: 'success', title, text, confirmButtonText: 'OK' });
  }

  error(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({ icon: 'error', title, text, confirmButtonText: 'OK' });
  }

  warning(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({ icon: 'warning', title, text, confirmButtonText: 'OK' });
  }

  confirm(title: string, text?: string, confirmText = 'Confirmar', cancelText = 'Cancelar'): Promise<boolean> {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    }).then((r) => r.isConfirmed);
  }

  fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire(options);
  }

  toast(title: string, icon: SweetAlertIcon = 'success'): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
    void Toast.fire({ icon, title });
  }
}
