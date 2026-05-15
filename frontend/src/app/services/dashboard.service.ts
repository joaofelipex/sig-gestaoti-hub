import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { EmpresaService } from './empresa.service';

interface HasEmpresa { empresa_id?: string | null; }

export interface Asset extends HasEmpresa {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: 'Em uso' | 'Estoque' | 'Manutenção' | 'Aposentado';
  assignedTo: string | null;
  department: string;
  purchaseDate: string;
  warrantyEnd: string;
  specs: any;
  purchaseValue: number;
  maintenanceLog: any[];
}

export interface Domain {
  id: string;
  url: string;
  registrar: string;
  expirationDate: string;
  renewalCost: number;
  autoRenew: boolean;
  dnsProvider: string;
  hostingProvider: string;
  sslExpiration: string;
  status: string;
}

export interface License {
  id: string;
  software: string;
  type: 'Mensal' | 'Anual';
  totalLicenses: number;
  usedLicenses: number;
  activationKey: string;
  costPerUnit: number;
  renewalDate: string;
  vendor: string;
  category: string;
}

export interface Server {
  id: string;
  name: string;
  provider: string;
  type: string;
  region: string;
  ip: string;
  os: string;
  cpu: string;
  ram: string;
  storage: string;
  status: string;
  uptime: number;
  monthlyCost: number;
  purpose: string;
  responsibleTeam: string;
  contractEnd: string;
  lastBackup: string;
  monitoringUrl?: string;
  sslExpiration?: string;
  notes?: string;
}

export interface Maintenance {
  id: string;
  ativo_id: string;
  tipo: string;
  status: string;
  data_abertura: string;
  data_conclusao: string | null;
  custo: number | null;
  fornecedor: string | null;
  descricao: string | null;
}

export interface Movement {
  id: string;
  ativo_id: string;
  ativo_label: string | null;
  tipo: string;
  data: string;
  from_department: string | null;
  to_department: string | null;
  from_user: string | null;
  to_user: string | null;
  responsible: string | null;
  recipient: string | null;
  reason: string | null;
  notes: string | null;
  value: number | null;
  term_generated: boolean | null;
}

export interface Inventory {
  id: string;
  nome: string;
  categoria: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  unit_cost: number;
  location: string | null;
  supplier: string | null;
  sku: string | null;
  notes: string | null;
}

export interface Alert {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  severidade: 'info' | 'aviso' | 'critico';
  lida: boolean;
  link: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  year: number;
  category: string;
  costCenter: string;
  annualBudget: number;
  notes?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
  estimatedSavings: number;
  owner: string;
  dueDate?: string;
  status: string;
  createdAt: string;
}

export interface AccessRecord {
  id: string;
  user: string;
  resource: string;
  resourceType: string;
  accessLevel: string;
  grantedDate: string;
  lastAccess: string;
  ativo: boolean;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: string;
  owner: string | null;
  mitigation: string | null;
}

export interface Payment {
  id: string;
  nome: string;
  categoria: 'servidor' | 'licenca' | 'dominio' | 'contrato' | 'outro';
  competencia: string;
  valor: number;
  status: 'pendente' | 'pago' | 'atrasado';
  vencimento: string | null;
  data_pagamento: string | null;
  fornecedor: string | null;
  observacoes: string | null;
}

export interface FinancialContract {
  id: string;
  supplier: string;
  object: string;
  type: string;
  costCenter: string;
  monthlyCost: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private _raw = new BehaviorSubject<{
    assets: Asset[];
    domains: Domain[];
    licenses: License[];
    servers: Server[];
    contracts: FinancialContract[];
    maintenance: Maintenance[];
    movements: Movement[];
    inventory: Inventory[];
    alerts: Alert[];
    budgets: Budget[];
    actions: ActionItem[];
    accessRecords: AccessRecord[];
    risks: RiskItem[];
    payments: Payment[];
    loading: boolean;
  }>({
    assets: [], domains: [], licenses: [], servers: [], contracts: [],
    maintenance: [], movements: [], inventory: [], alerts: [], budgets: [],
    actions: [], accessRecords: [], risks: [], payments: [], loading: true
  });

  public readonly data$: Observable<any> = combineLatest([this._raw, this.empresa.selected$]).pipe(
    map(([raw, empId]) => {
      if (!empId) return raw;
      const f = (arr: any[]) => arr.filter(i => !i.empresa_id || i.empresa_id === empId);
      return {
        ...raw,
        assets: f(raw.assets), domains: f(raw.domains), licenses: f(raw.licenses),
        servers: f(raw.servers), contracts: f(raw.contracts), maintenance: f(raw.maintenance),
        movements: f(raw.movements), inventory: f(raw.inventory), alerts: f(raw.alerts),
        budgets: f(raw.budgets), actions: f(raw.actions), accessRecords: f(raw.accessRecords),
        risks: f(raw.risks), payments: f(raw.payments)
      };
    })
  );

  constructor(private supabaseService: SupabaseService, private empresa: EmpresaService) {
    this.loadData();
  }

  async loadData() {
    this._raw.next({ ...this._raw.value, loading: true });

    try {
      const [assetsRes, domainsRes, licensesRes, serversRes, contractsRes, maintenanceRes, movementsRes, inventoryRes, alertsRes, budgetsRes, actionsRes, accessRes, risksRes, paymentsRes] = await Promise.all([
        this.supabaseService.client.from('ativos').select('*'),
        this.supabaseService.client.from('dominios').select('*'),
        this.supabaseService.client.from('licencas').select('*'),
        this.supabaseService.client.from('servidores').select('*'),
        this.supabaseService.client.from('contratos').select('*'),
        this.supabaseService.client.from('manutencoes').select('*'),
        this.supabaseService.client.from('movimentacoes').select('*'),
        this.supabaseService.client.from('inventario').select('*'),
        this.supabaseService.client.from('alertas').select('*'),
        this.supabaseService.client.from('orcamentos').select('*'),
        this.supabaseService.client.from('acoes_economista').select('*'),
        this.supabaseService.client.from('registros_acesso').select('*'),
        this.supabaseService.client.from('riscos').select('*'),
        this.supabaseService.client.from('pagamentos').select('*')
      ]);

      const attach = <T>(rows: any[] | null | undefined, mapper: (r: any) => T): T[] =>
        (rows || []).map(r => ({ ...mapper(r), empresa_id: r.empresa_id ?? null } as T));
      const assets = attach(assetsRes.data, this.mapAsset);
      const domains = attach(domainsRes.data, this.mapDomain);
      const licenses = attach(licensesRes.data, this.mapLicense);
      const servers = attach(serversRes.data, this.mapServer);
      const contracts = attach(contractsRes.data, this.mapContract);
      const maintenance = attach(maintenanceRes.data, this.mapMaintenance);
      const movements = attach(movementsRes.data, this.mapMovement);
      const inventory = attach(inventoryRes.data, this.mapInventory);
      const alerts = attach(alertsRes.data, this.mapAlert);
      const budgets = attach(budgetsRes.data, this.mapBudget);
      const actions = attach(actionsRes.data, this.mapAction);
      const accessRecords = attach(accessRes.data, this.mapAccessRecord);
      const risks = attach(risksRes.data, this.mapRisk);
      const payments = attach(paymentsRes.data, this.mapPayment);

      this._raw.next({
        assets, domains, licenses, servers, contracts,
        maintenance, movements, inventory, alerts, budgets,
        actions, accessRecords, risks, payments, loading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this._raw.next({ ...this._raw.value, loading: false });
    }
  }

  private mapAsset(r: any): Asset {
    return {
      id: r.id,
      type: r.tipo || 'Notebook',
      brand: r.marca || '',
      model: r.modelo || '',
      serialNumber: r.numero_serie || '',
      status: r.status === 'ativo' ? 'Em uso' : r.status === 'estoque' ? 'Estoque' : r.status === 'manutencao' ? 'Manutenção' : 'Aposentado',
      assignedTo: r.assigned_to || null,
      department: r.department_nome || '',
      purchaseDate: r.data_aquisicao || new Date().toISOString().slice(0, 10),
      warrantyEnd: r.warranty_end || '',
      specs: r.specs || {},
      purchaseValue: Number(r.valor_aquisicao || 0),
      maintenanceLog: r.maintenance_log || [],
    };
  }

  private mapDomain(r: any): Domain {
    const exp = r.data_vencimento || '';
    const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : 999;
    const status = days <= 0 ? 'Expirado' : days <= 30 ? 'Expirando' : 'Ativo';
    return {
      id: r.id,
      url: r.nome,
      registrar: r.registrar || '',
      expirationDate: exp,
      renewalCost: Number(r.custo_renovacao || r.custo_anual || 0),
      autoRenew: !!r.auto_renovacao,
      dnsProvider: r.dns_provider || '',
      hostingProvider: r.hosting_provider || '',
      sslExpiration: r.ssl_vencimento || exp,
      status,
    };
  }

  private mapLicense(r: any): License {
    return {
      id: r.id,
      software: r.nome,
      type: r.tipo || 'Mensal',
      totalLicenses: r.total_licencas || 0,
      usedLicenses: r.qtd_usuarios || 0,
      activationKey: r.chave_ativacao || '',
      costPerUnit: Number(r.custo_unitario || 0),
      renewalDate: r.data_renovacao || '',
      vendor: r.fornecedor || '',
      category: r.categoria || 'Produtividade',
    };
  }

  private mapServer(r: any): Server {
    return {
      id: r.id,
      name: r.nome,
      provider: r.provedor || 'Outro',
      type: r.tipo || 'VPS',
      region: r.regiao || '',
      ip: r.ip_publico || '',
      os: r.sistema_operacional || '',
      cpu: r.cpu || '',
      ram: r.ram || '',
      storage: r.armazenamento || '',
      status: r.status || 'Online',
      uptime: Number(r.uptime_pct || 100),
      monthlyCost: Number(r.custo_mensal || 0),
      purpose: r.finalidade || '',
      responsibleTeam: r.equipe_responsavel || '',
      contractEnd: r.contrato_fim || '',
      lastBackup: r.ultimo_backup || '',
      monitoringUrl: r.url_monitoramento,
      sslExpiration: r.ssl_vencimento,
      notes: r.observacoes,
    };
  }

  private mapContract(r: any): FinancialContract {
    return {
      id: r.id,
      supplier: r.supplier,
      object: r.object,
      type: r.type || 'OPEX',
      costCenter: r.cost_center || '',
      monthlyCost: Number(r.monthly_cost || 0),
    };
  }

  private mapMaintenance(r: any): Maintenance {
    return {
      id: r.id,
      ativo_id: r.ativo_id,
      tipo: r.tipo,
      status: r.status,
      data_abertura: r.data_abertura,
      data_conclusao: r.data_conclusao,
      custo: r.custo ? Number(r.custo) : null,
      fornecedor: r.fornecedor,
      descricao: r.descricao,
    };
  }

  private mapMovement(r: any): Movement {
    return {
      id: r.id,
      ativo_id: r.ativo_id,
      ativo_label: r.ativo_label,
      tipo: r.tipo,
      data: r.data,
      from_department: r.from_department,
      to_department: r.to_department,
      from_user: r.from_user,
      to_user: r.to_user,
      responsible: r.responsible,
      recipient: r.recipient,
      reason: r.reason,
      notes: r.notes,
      value: r.value ? Number(r.value) : null,
      term_generated: r.term_generated,
    };
  }

  private mapInventory(r: any): Inventory {
    return {
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      quantity: Number(r.quantity || 0),
      min_quantity: Number(r.min_quantity || 0),
      unit: r.unit,
      unit_cost: Number(r.unit_cost || 0),
      location: r.location,
      supplier: r.supplier,
      sku: r.sku,
      notes: r.notes,
    };
  }

  private mapAlert(r: any): Alert {
    return {
      id: r.id,
      titulo: r.titulo,
      mensagem: r.mensagem,
      tipo: r.tipo,
      severidade: r.severidade,
      lida: r.lida,
      link: r.link,
      created_at: r.created_at,
    };
  }

  private mapBudget(r: any): Budget {
    return {
      id: r.id,
      year: Number(r.year),
      category: r.category,
      costCenter: r.cost_center,
      annualBudget: Number(r.annual_budget),
      notes: r.notes,
    };
  }

  private mapAction(r: any): ActionItem {
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: r.category,
      priority: r.priority,
      effort: r.effort,
      estimatedSavings: Number(r.estimated_savings),
      owner: r.owner || '',
      dueDate: r.due_date,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  private mapAccessRecord(r: any): AccessRecord {
    return {
      id: r.id,
      user: r.user_label || '',
      resource: r.recurso || '',
      resourceType: r.recurso_tipo || 'Aplicação',
      accessLevel: r.nivel_acesso || 'Leitura',
      grantedDate: r.data_concessao,
      lastAccess: r.ultimo_acesso || r.data_concessao,
      ativo: r.ativo,
    };
  }

  private mapRisk(r: any): RiskItem {
    return {
      id: r.id,
      title: r.title,
      severity: r.severity,
      owner: r.owner,
      mitigation: r.mitigation,
    };
  }

  private mapPayment(r: any): Payment {
    return {
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      competencia: r.competencia,
      valor: Number(r.valor),
      status: r.status,
      vencimento: r.vencimento,
      data_pagamento: r.data_pagamento,
      fornecedor: r.fornecedor,
      observacoes: r.observacoes,
    };
  }
}