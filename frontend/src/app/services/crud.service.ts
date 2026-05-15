import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DashboardService } from './dashboard.service';
import { ToastService } from './toast.service';
import { EmpresaService } from './empresa.service';

const TABLES_WITH_EMPRESA = new Set([
  'ativos','licencas','dominios','servidores','manutencoes','movimentacoes',
  'pagamentos','contratos','inventario','inventario_movimentacoes',
  'registros_acesso','riscos','orcamentos','acoes_economista',
  'termos_responsabilidade','usuarios','departamentos','dns_records','alertas'
]);

@Injectable({ providedIn: 'root' })
export class CrudService {
  constructor(
    private supa: SupabaseService,
    private dashboard: DashboardService,
    private toast: ToastService,
    private empresa: EmpresaService,
  ) {}

  private async getOrgId(): Promise<string | null> {
    const { data } = await this.supa.client.auth.getUser();
    if (!data.user) return null;
    const { data: prof } = await this.supa.client.from('profiles').select('org_id').eq('user_id', data.user.id).maybeSingle();
    return (prof as any)?.org_id || null;
  }

  async upsert(table: string, payload: any): Promise<boolean> {
    const orgId = await this.getOrgId();
    if (!orgId) { this.toast.show({ title: 'Erro', description: 'Sessão inválida', variant: 'destructive' }); return false; }
    const row = { ...payload, org_id: orgId };
    const op = row.id
      ? this.supa.client.from(table as any).update(row).eq('id', row.id)
      : this.supa.client.from(table as any).insert(row);
    const { error } = await op;
    if (error) { this.toast.show({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    this.toast.show({ title: row.id ? 'Atualizado' : 'Criado', description: 'Registro salvo com sucesso' });
    await this.dashboard.loadData();
    return true;
  }

  async remove(table: string, id: string): Promise<boolean> {
    const { error } = await this.supa.client.from(table as any).delete().eq('id', id);
    if (error) { this.toast.show({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    this.toast.show({ title: 'Excluído', description: 'Registro removido' });
    await this.dashboard.loadData();
    return true;
  }

  async bulkInsert(table: string, rows: any[]): Promise<number> {
    const orgId = await this.getOrgId();
    if (!orgId || !rows.length) return 0;
    const payload = rows.map(r => ({ ...r, org_id: orgId }));
    const { error, data } = await this.supa.client.from(table as any).insert(payload).select();
    if (error) { this.toast.show({ title: 'Erro na importação', description: error.message, variant: 'destructive' }); return 0; }
    this.toast.show({ title: 'Importação concluída', description: `${data?.length || 0} registros importados` });
    await this.dashboard.loadData();
    return data?.length || 0;
  }
}
