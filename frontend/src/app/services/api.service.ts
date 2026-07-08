import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_STORAGE_KEY } from './auth-storage';

export interface MeResponse {
  user: { id: string; email?: string };
  profile: {
    org_id: string;
    org_nome?: string;
    nome: string;
    email: string;
    avatar_url?: string | null;
    role?: 'admin' | 'gestor' | 'usuario';
  };
  permissions?: { canWrite: boolean };
  postgres?: { configured: string; database: string | null; host: string | null; port: number | null };
  dataCounts?: { ativos: number; empresas: number; alertas: number };
  dataScope?: 'all' | 'org';
  writeScope?: 'all' | 'org';
}

export interface DataStatusResponse {
  org_id: string;
  org_nome: string;
  dataScope: 'all' | 'org';
  role: 'admin' | 'gestor' | 'usuario';
  tableCounts: Record<string, number>;
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

  patchProfile(body: { nome?: string; email?: string; avatar_url?: string | null }): Observable<{ profile: MeResponse['profile'] }> {
    return this.http.patch<{ profile: MeResponse['profile'] }>(this.api('/auth/me'), body);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.api('/auth/change-password'), { currentPassword, newPassword });
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.api('/auth/logout'), {});
  }

  getDashboard(tables?: string[]): Observable<Record<string, unknown[]>> {
    const params = tables?.length ? { tables: tables.join(',') } : undefined;
    return this.http.get<Record<string, unknown[]>>(this.api('/data/dashboard'), { params });
  }

  getHealth(): Observable<{
    ok: boolean;
    api?: string;
    database?: string;
    postgres?: { database: string; host: string; port: number; configured: string };
    error?: string;
    configured?: string;
  }> {
    return this.http.get<{
      ok: boolean;
      api?: string;
      database?: string;
      postgres?: { database: string; host: string; port: number; configured: string };
      error?: string;
      configured?: string;
    }>(this.api('/health'));
  }

  getEmpresas(): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.api('/data/empresas'));
  }

  getDataStatus(): Observable<DataStatusResponse> {
    return this.http.get<DataStatusResponse>(this.api('/data/status'));
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
