import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_TOKEN_STORAGE_KEY } from '../core/api.constants';

export type DashboardApiPayload = Record<string, Record<string, unknown>[]>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl.replace(/\/$/, '');
  private readonly authTick = new Subject<void>();
  /** Emite após login/logout ou fim do bootstrap da sessão (token em localStorage). */
  readonly authChanged$ = this.authTick.asObservable();

  constructor(private http: HttpClient) {}

  emitAuthChange() {
    this.authTick.next();
  }

  setToken(token: string | null) {
    if (token) localStorage.setItem(API_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    this.authTick.next();
  }

  getToken(): string | null {
    return localStorage.getItem(API_TOKEN_STORAGE_KEY);
  }

  login(email: string, password: string): Observable<{ token: string; user: { id: string; email: string } }> {
    return this.http.post<{ token: string; user: { id: string; email: string } }>(`${this.base}/auth/login`, {
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
    return this.http.post<{ token: string; user: { id: string; email: string } }>(`${this.base}/auth/signup`, body);
  }

  me(): Observable<{
    user: { id: string; email: string };
    profile: { org_id: string; nome: string; email: string };
  }> {
    return this.http.get<{
      user: { id: string; email: string };
      profile: { org_id: string; nome: string; email: string };
    }>(`${this.base}/auth/me`);
  }

  getDashboard(): Observable<DashboardApiPayload> {
    return this.http.get<DashboardApiPayload>(`${this.base}/data/dashboard`);
  }

  getEmpresas(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/data/empresas`);
  }

  /** Base HTTP sem sufixo `/api` (ex.: `GET /health`). */
  getServerRoot(): string {
    return this.base.replace(/\/api\/?$/i, '');
  }

  health(): Observable<{ ok?: boolean }> {
    return this.http.get<{ ok?: boolean }>(`${this.getServerRoot()}/health`);
  }

  getDataSummary(): Observable<{
    org_id: string;
    profile_email: string;
    postgres_version: string;
    counts: Record<string, number>;
  }> {
    return this.http.get<{
      org_id: string;
      profile_email: string;
      postgres_version: string;
      counts: Record<string, number>;
    }>(`${this.base}/data/summary`);
  }

  postTable(table: string, body: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/data/${table}`, body);
  }

  patchTable(table: string, id: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.patch(`${this.base}/data/${table}/${id}`, body);
  }

  deleteTable(table: string, id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/data/${table}/${id}`);
  }
}
