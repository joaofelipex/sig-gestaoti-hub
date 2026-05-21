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
        catchError((err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 401 || status === 403 || status === 404) {
            this.api.setToken(null);
            this._user.next(null);
          }
          return of(null);
        }),
        finalize(() => {
          this._loading.next(false);
          this.api.emitAuthChange();
        }),
      )
      .subscribe();
  }

  private httpErrorMessage(err: unknown, fallback: string): Error {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return new Error(fallback);
      if (err.error && typeof err.error === 'object' && 'error' in err.error) {
        return new Error(String((err.error as { error: string }).error));
      }
    }
    return err instanceof Error ? err : new Error(fallback);
  }

  signIn(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.login(email, password).subscribe({
        next: (res) => {
          this.api.setToken(res.token);
          this._user.next({ id: res.user.id, email: res.user.email });
          this._loading.next(false);
          resolve();
        },
        error: (err: unknown) =>
          reject(
            this.httpErrorMessage(
              err,
              'Não foi possível conectar à API. Confirme: cd backend && npm run dev',
            ),
          ),
      });
    });
  }

  signUp(email: string, password: string, nome: string, organizacao: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.signup({ email, password, nome, organizacao }).subscribe({
        next: (res) => {
          this.api.setToken(res.token);
          this._user.next({ id: res.user.id, email: res.user.email });
          this._loading.next(false);
          resolve();
        },
        error: (err: unknown) =>
          reject(
            this.httpErrorMessage(
              err,
              'Não foi possível conectar à API. Confirme: cd backend && npm run dev',
            ),
          ),
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
