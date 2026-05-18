import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

export interface Empresa {
  id: string;
  org_id?: string | null;
  nome: string;
  cnpj: string | null;
  segmento: string | null;
  responsavel: string | null;
  ativo: boolean;
  observacoes: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

const STORAGE_KEY = 'imts_selected_empresa';

function normalizeCnpj(cnpj: string | null | undefined): string {
  return String(cnpj ?? '').replace(/\D/g, '');
}

function normalizeNome(nome: string | null | undefined): string {
  return String(nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function empresaKey(e: Empresa): string {
  const cnpj = normalizeCnpj(e.cnpj);
  if (cnpj.length >= 11) return `cnpj:${cnpj}`;
  const nome = normalizeNome(e.nome);
  if (nome) return `nome:${nome}`;
  return `id:${e.id}`;
}

function empresaScore(e: Empresa): number {
  for (const d of [e.updated_at, e.created_at]) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function dedupeEmpresas(rows: Empresa[]): Empresa[] {
  const byKey = new Map<string, Empresa>();
  for (const e of rows) {
    if (!e?.id) continue;
    const key = empresaKey(e);
    const prev = byKey.get(key);
    if (!prev || empresaScore(e) > empresaScore(prev)) byKey.set(key, e);
  }
  return [...byKey.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private _list = new BehaviorSubject<Empresa[]>([]);
  private _loading = new BehaviorSubject<boolean>(false);
  private _selected = new BehaviorSubject<string | null>(localStorage.getItem(STORAGE_KEY));
  private loadInFlight: Promise<void> | null = null;

  list$ = this._list.asObservable();
  loading$ = this._loading.asObservable();
  selected$ = this._selected.asObservable();

  constructor(
    private api: ApiService,
    private toast: ToastService,
  ) {
    this.api.authChanged$.subscribe(() => {
      if (!this.api.getToken()) {
        this._list.next([]);
        this._loading.next(false);
        return;
      }
      void this.load();
    });
  }

  get selectedId() {
    return this._selected.value;
  }
  get list() {
    return this._list.value;
  }

  setSelected(id: string | null) {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    this._selected.next(id);
  }

  async load(): Promise<void> {
    if (this.loadInFlight) {
      return this.loadInFlight;
    }
    this.loadInFlight = this.fetchList().finally(() => {
      this.loadInFlight = null;
    });
    return this.loadInFlight;
  }

  private async fetchList(): Promise<void> {
    this._loading.next(true);
    try {
      const raw = await firstValueFrom(this.api.getEmpresas());
      const list = dedupeEmpresas(Array.isArray(raw) ? (raw as Empresa[]) : []);
      this._list.next(list);
      if (this._selected.value && !list.find((e) => e.id === this._selected.value)) {
        this.setSelected(null);
      }
    } catch (e: unknown) {
      this._list.next([]);
      const msg =
        e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
          ? String((e.error as { error: string }).error)
          : 'Não foi possível carregar empresas';
      this.toast.show({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      this._loading.next(false);
    }
  }

  private async getOrgId(): Promise<string | null> {
    try {
      const me = await firstValueFrom(this.api.me());
      return me.profile.org_id;
    } catch {
      return null;
    }
  }

  async upsert(payload: Partial<Empresa> & { id?: string }): Promise<boolean> {
    const orgId = await this.getOrgId();
    if (!orgId) return false;
    const row: Record<string, unknown> = { ...payload, org_id: orgId };
    try {
      if (row['id']) {
        await firstValueFrom(this.api.patchTable('empresas', String(row['id']), row));
      } else {
        await firstValueFrom(this.api.postTable('empresas', row));
      }
      this.toast.show({ title: 'Salvo', description: 'Empresa salva com sucesso' });
      await this.load();
      return true;
    } catch (e: unknown) {
      const msg =
        e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
          ? String((e.error as { error: string }).error)
          : e instanceof HttpErrorResponse
            ? e.message
            : 'Erro';
      this.toast.show({ title: 'Erro', description: msg, variant: 'destructive' });
      return false;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteTable('empresas', id));
      this.toast.show({ title: 'Removida', description: 'Empresa removida' });
      if (this._selected.value === id) this.setSelected(null);
      await this.load();
      return true;
    } catch (e: unknown) {
      const msg =
        e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
          ? String((e.error as { error: string }).error)
          : e instanceof HttpErrorResponse
            ? e.message
            : 'Erro';
      this.toast.show({ title: 'Erro', description: msg, variant: 'destructive' });
      return false;
    }
  }

  nameOf(id: string | null | undefined): string {
    if (!id) return '—';
    return this._list.value.find((e) => e.id === id)?.nome || '—';
  }
}
