import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_STORAGE_KEY } from './auth-storage';

export interface MeResponse {
  user: { id: string; email?: string };
  profile: { org_id: string; org_nome?: string; nome: string; email: string };
  postgres?: { configured: string; database: string | null; host: string | null; port: number | null };
  dataCounts?: { ativos: number; empresas: number; alertas: number };
  dataScope?: 'all' | 'org';
  databaseSummary?: {
    totalAtivos: number;
    topOrg: { org_id: string; org_nome: string; ativos: number } | null;
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  /** Replay(1) para serviços criados depois do bootstrap/login ainda receberem o sinal. */
  private readonly _authChanged = new ReplaySubject<void>(1);
  readonly authChanged$ = this._authChanged.asObservable();

  constructor(private http: HttpClient) {}

  private api(path: string): string {
    const base = environment.apiUrl.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  setToken(token: string | null): void {
    if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    this.emitAuthChange();
  }

  emitAuthChange(): void {
    this._authChanged.next();
  }

  login(email: string, password: string): Observable<{ token: string; user: { id: string; email: string } }> {
    return this.http.post<{ token: string; user: { id: string; email: string } }>(this.api('/auth/login'), {
      email,
      password,
    });
  }

  signup(body: {
    email: string;
    password: string;
    nome: string;
    organizacao: string;
  }): Observable<{ token: string; user: { id: string; email: string } }> {
    return this.http.post<{ token: string; user: { id: string; email: string } }>(this.api('/auth/signup'), body);
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(this.api('/auth/me'));
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.api('/auth/logout'), {});
  }

  getDashboard(): Observable<Record<string, unknown[]>> {
    return this.http.get<Record<string, unknown[]>>(this.api('/data/dashboard'));
  }

  getHealth(): Observable<{
    ok: boolean;
    database?: string;
    postgres?: { database: string; host: string; port: number; configured: string };
    error?: string;
    configured?: string;
  }> {
    return this.http.get<{
      ok: boolean;
      database?: string;
      postgres?: { database: string; host: string; port: number; configured: string };
      error?: string;
      configured?: string;
    }>('/health');
  }

  getEmpresas(): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.api('/data/empresas'));
  }

  postTable(table: string, body: unknown): Observable<unknown> {
    return this.http.post<unknown>(this.api(`/data/${encodeURIComponent(table)}`), body);
  }

  patchTable(table: string, id: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<unknown>(this.api(`/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}`), body);
  }

  deleteTable(table: string, id: string): Observable<unknown> {
    return this.http.delete<unknown>(this.api(`/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}`));
  }
}
