import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  segmento: string | null;
  responsavel: string | null;
  ativo: boolean;
  observacoes: string | null;
}

const STORAGE_KEY = 'imts_selected_empresa';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private _list = new BehaviorSubject<Empresa[]>([]);
  private _selected = new BehaviorSubject<string | null>(localStorage.getItem(STORAGE_KEY));

  list$ = this._list.asObservable();
  selected$ = this._selected.asObservable();

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
  ) {
    const onAuth = () => {
      if (!this.api.getToken()) {
        this._list.next([]);
        return;
      }
      void this.load();
    };
    this.api.authChanged$.subscribe(onAuth);
    this.auth.loading$.subscribe((loading) => {
      if (!loading && this.api.getToken()) {
        void this.load();
      }
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

  async load() {
    try {
      const data = (await firstValueFrom(this.api.getEmpresas())) as Empresa[];
      const list = data ?? [];
      this._list.next(list);
      if (this._selected.value && !list.find((e) => e.id === this._selected.value)) {
        this.setSelected(null);
      }
    } catch {
      this._list.next([]);
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
