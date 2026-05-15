import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, finalize, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AuthUser {
  id: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _user = new BehaviorSubject<AuthUser | null>(null);
  private _loading = new BehaviorSubject<boolean>(true);

  readonly user$ = this._user.asObservable();
  readonly loading$ = this._loading.asObservable();

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.bootstrap();
  }

  private bootstrap() {
    const token = this.api.getToken();
    if (!token) {
      this._loading.next(false);
      this.api.emitAuthChange();
      return;
    }
    this.api
      .me()
      .pipe(
        tap((res) => this._user.next({ id: res.user.id, email: res.user.email })),
        catchError(() => {
          this.api.setToken(null);
          this._user.next(null);
          return of(null);
        }),
        finalize(() => {
          this._loading.next(false);
          this.api.emitAuthChange();
        }),
      )
      .subscribe();
  }

  signIn(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.login(email, password).subscribe({
        next: (res) => {
          this.api.setToken(res.token);
          this._user.next({ id: res.user.id, email: res.user.email });
          resolve();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'error' in err.error) {
            reject(new Error(String((err.error as { error: string }).error)));
            return;
          }
          reject(err instanceof Error ? err : new Error('Erro'));
        },
      });
    });
  }

  signUp(email: string, password: string, nome: string, organizacao: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.signup({ email, password, nome, organizacao }).subscribe({
        next: (res) => {
          this.api.setToken(res.token);
          this._user.next({ id: res.user.id, email: res.user.email });
          resolve();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'error' in err.error) {
            reject(new Error(String((err.error as { error: string }).error)));
            return;
          }
          reject(err instanceof Error ? err : new Error('Erro'));
        },
      });
    });
  }

  async signOut() {
    this.api.setToken(null);
    this._user.next(null);
    this.router.navigate(['/auth']);
  }

  get user(): AuthUser | null {
    return this._user.value;
  }

  get loading(): boolean {
    return this._loading.value;
  }
}
