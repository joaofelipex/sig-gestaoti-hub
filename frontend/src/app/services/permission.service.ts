import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type AppRole = 'admin' | 'gestor' | 'usuario';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private _canWrite = new BehaviorSubject<boolean>(false);
  private _role = new BehaviorSubject<AppRole>('usuario');

  readonly canWrite$ = this._canWrite.asObservable();
  readonly role$ = this._role.asObservable();

  constructor(private api: ApiService) {
    this.api.authChanged$.subscribe(() => void this.refresh());
    void this.refresh();
  }

  get canWrite(): boolean {
    return this._canWrite.value;
  }

  get role(): AppRole {
    return this._role.value;
  }

  async refresh(): Promise<void> {
    if (!this.api.getToken()) {
      this._canWrite.next(false);
      this._role.next('usuario');
      return;
    }
    try {
      const me = await firstValueFrom(this.api.me());
      const role = me.profile.role ?? 'usuario';
      this._role.next(role);
      this._canWrite.next(me.permissions?.canWrite ?? role !== 'usuario');
    } catch {
      this._canWrite.next(false);
      this._role.next('usuario');
    }
  }
}
