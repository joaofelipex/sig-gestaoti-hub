import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
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
const SEED_NAMES = [
  'IMTS Holding', 'Onni.ai', 'Reach', 'Mobcall', 'PMGT', 'Hcitis',
  'TRON', 'Auttis', 'Onni.ai Fortaleza', 'Doutor-ai', 'Siders',
  'Vycma', 'Visttoriar', 'Smartts', 'Reddi'
];

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private _list = new BehaviorSubject<Empresa[]>([]);
  private _selected = new BehaviorSubject<string | null>(localStorage.getItem(STORAGE_KEY));

  list$ = this._list.asObservable();
  selected$ = this._selected.asObservable();

  constructor(private supa: SupabaseService, private toast: ToastService) {
    this.load();
  }

  get selectedId() { return this._selected.value; }
  get list() { return this._list.value; }

  setSelected(id: string | null) {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    this._selected.next(id);
  }

  async load() {
    const { data } = await this.supa.client.from('empresas').select('*').order('nome');
    const list = (data ?? []) as Empresa[];
    this._list.next(list);
    if (list.length === 0) {
      await this.seedDefaults();
    } else if (this._selected.value && !list.find(e => e.id === this._selected.value)) {
      this.setSelected(null);
    }
  }

  private async getOrgId(): Promise<string | null> {
    const { data } = await this.supa.client.auth.getUser();
    if (!data.user) return null;
    const { data: prof } = await this.supa.client.from('profiles').select('org_id').eq('user_id', data.user.id).maybeSingle();
    return (prof as any)?.org_id || null;
  }

  private async seedDefaults() {
    const orgId = await this.getOrgId();
    if (!orgId) return;
    const rows = SEED_NAMES.map(nome => ({ org_id: orgId, nome, ativo: true }));
    const { data, error } = await this.supa.client.from('empresas').insert(rows).select();
    if (!error && data) {
      this._list.next((data ?? []) as Empresa[]);
      this.toast.show({ title: 'Empresas cadastradas', description: `${data.length} empresas da holding inicializadas` });
    }
  }

  async upsert(payload: Partial<Empresa> & { id?: string }): Promise<boolean> {
    const orgId = await this.getOrgId();
    if (!orgId) return false;
    const row: any = { ...payload, org_id: orgId };
    const op = row.id
      ? this.supa.client.from('empresas').update(row).eq('id', row.id)
      : this.supa.client.from('empresas').insert(row);
    const { error } = await op;
    if (error) { this.toast.show({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    this.toast.show({ title: 'Salvo', description: 'Empresa salva com sucesso' });
    await this.load();
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await this.supa.client.from('empresas').delete().eq('id', id);
    if (error) { this.toast.show({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    this.toast.show({ title: 'Removida', description: 'Empresa removida' });
    if (this._selected.value === id) this.setSelected(null);
    await this.load();
    return true;
  }

  nameOf(id: string | null | undefined): string {
    if (!id) return '—';
    return this._list.value.find(e => e.id === id)?.nome || '—';
  }
}
