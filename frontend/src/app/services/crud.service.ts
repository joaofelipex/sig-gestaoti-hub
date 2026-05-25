import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardService } from './dashboard.service';
import { ToastService } from './toast.service';
import { EmpresaService } from './empresa.service';

const TABLES_WITH_EMPRESA = new Set([
  'ativos',
  'licencas',
  'dominios',
  'servidores',
  'manutencoes',
  'movimentacoes',
  'pagamentos',
  'contratos',
  'inventario',
  'inventario_movimentacoes',
  'registros_acesso',
  'riscos',
  'orcamentos',
  'acoes_economista',
  'termos_responsabilidade',
  'usuarios',
  'departamentos',
  'dns_records',
  'alertas',
]);

@Injectable({ providedIn: 'root' })
export class CrudService {
  constructor(
    private api: ApiService,
    private dashboard: DashboardService,
    private toast: ToastService,
    private empresa: EmpresaService,
  ) {}

  private async getOrgId(): Promise<string | null> {
    try {
      const me = await firstValueFrom(this.api.me());
      return me.profile.org_id;
    } catch {
      return null;
    }
  }

  private withEmpresa(table: string, row: Record<string, unknown>): Record<string, unknown> {
    if (!TABLES_WITH_EMPRESA.has(table)) return row;
    if (row['empresa_id'] !== undefined && row['empresa_id'] !== '') return row;
    const sel = this.empresa.selectedId;
    return sel ? { ...row, empresa_id: sel } : { ...row, empresa_id: row['empresa_id'] || null };
  }

  private errMsg(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const b = e.error as { error?: string } | undefined;
      if (b?.error) return b.error;
      return e.message;
    }
    return e instanceof Error ? e.message : 'Erro';
  }

  async upsert(table: string, payload: Record<string, unknown>): Promise<boolean> {
    const orgId = await this.getOrgId();
    if (!orgId) {
      this.toast.show({ title: 'Erro', description: 'Sessão inválida', variant: 'destructive' });
      return false;
    }
    const row = this.withEmpresa(table, { ...payload, org_id: orgId }) as Record<string, unknown>;
    if (row['empresa_id'] === '') row['empresa_id'] = null;
    try {
      let saved: unknown;
      if (row['id']) {
        saved = await firstValueFrom(this.api.patchTable(table, String(row['id']), row));
      } else {
        saved = await firstValueFrom(this.api.postTable(table, row));
      }
      this.dashboard.applyTableMutation(table, saved, 'upsert');
      void this.dashboard.refreshAfterMutation();
      this.toast.show({ title: row['id'] ? 'Atualizado' : 'Criado', description: 'Registro salvo com sucesso' });
      return true;
    } catch (e: unknown) {
      this.toast.show({ title: 'Erro', description: this.errMsg(e), variant: 'destructive' });
      return false;
    }
  }

  async remove(table: string, id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteTable(table, id));
      this.dashboard.applyTableMutation(table, id, 'delete');
      void this.dashboard.refreshAfterMutation();
      this.toast.show({ title: 'Excluído', description: 'Registro removido' });
      return true;
    } catch (e: unknown) {
      this.toast.show({ title: 'Erro', description: this.errMsg(e), variant: 'destructive' });
      return false;
    }
  }

  async bulkInsert(table: string, rows: Record<string, unknown>[]): Promise<number> {
    const orgId = await this.getOrgId();
    if (!orgId || !rows.length) return 0;
    const payload = rows.map((r) => this.withEmpresa(table, { ...r, org_id: orgId }));
    try {
      const data = await firstValueFrom(this.api.postTable(table, payload));
      const n = Array.isArray(data) ? data.length : 1;
      if (Array.isArray(data)) {
        data.forEach((row) => this.dashboard.applyTableMutation(table, row, 'upsert'));
      } else {
        this.dashboard.applyTableMutation(table, data, 'upsert');
      }
      void this.dashboard.refreshAfterMutation();
      this.toast.show({ title: 'Importação concluída', description: `${n} registros importados` });
      return n;
    } catch (e: unknown) {
      this.toast.show({ title: 'Erro na importação', description: this.errMsg(e), variant: 'destructive' });
      return 0;
    }
  }
}
