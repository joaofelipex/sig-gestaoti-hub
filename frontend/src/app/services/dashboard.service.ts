import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, firstValueFrom } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { EmpresaService } from './empresa.service';
import { ToastService } from './toast.service';

interface HasEmpresa { empresa_id?: string | null; }

export interface Asset extends HasEmpresa {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: 'Em uso' | 'Estoque' | 'Manutenção' | 'Aposentado' | '';
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
  observacoes?: string;
}

export interface License {
  id: string;
  software: string;
  type: 'Mensal' | 'Anual';
  totalLicenses: number;
  usedLicenses: number;
  activationKey: string;
  costPerUnit: number;
  /** Custo mensal explícito (coluna custo_mensal), quando cadastrado. */
  monthlyCost?: number;
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
  status: string;
  costCenter: string;
  monthlyCost: number;
  endDate: string;
}

export interface DnsRecord {
  id: string;
  dominio_id: string;
  tipo: string;
  nome: string;
  valor: string;
  ttl: number;
  prioridade: number | null;
  observacoes: string | null;
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
    dnsRecords: DnsRecord[];
    loading: boolean;
  }>({
    assets: [], domains: [], licenses: [], servers: [], contracts: [],
    maintenance: [], movements: [], inventory: [], alerts: [], budgets: [],
    actions: [], accessRecords: [], risks: [], payments: [], dnsRecords: [], loading: false
  });

  private loadInFlight: Promise<void> | null = null;
  private lastFetchAt = 0;
  /** Só true após as duas fases (prioridade + background) concluírem com sucesso. */
  private fetchComplete = false;
  private readonly cacheMs = 30_000;

  /** Tabelas necessárias para o painel principal (carregadas primeiro). */
  private static readonly PRIORITY_TABLES = [
    'ativos',
    'dominios',
    'licencas',
    'servidores',
    'alertas',
    'pagamentos',
  ] as const;

  private static readonly BACKGROUND_TABLES = [
    'contratos',
    'manutencoes',
    'movimentacoes',
    'inventario',
    'orcamentos',
    'acoes_economista',
    'registros_acesso',
    'riscos',
    'dns_records',
  ] as const;

  private static readonly TABLE_STATE_KEYS: Record<string, string> = {
    ativos: 'assets',
    dominios: 'domains',
    licencas: 'licenses',
    servidores: 'servers',
    contratos: 'contracts',
    manutencoes: 'maintenance',
    movimentacoes: 'movements',
    inventario: 'inventory',
    alertas: 'alerts',
    orcamentos: 'budgets',
    acoes_economista: 'actions',
    registros_acesso: 'accessRecords',
    riscos: 'risks',
    pagamentos: 'payments',
    dns_records: 'dnsRecords',
  };

  /** Populated in the constructor so `empresa` (a ctor parameter) exists before use. */
  public readonly data$: Observable<any>;

  constructor(
    private api: ApiService,
    private empresa: EmpresaService,
    private auth: AuthService,
    private toast: ToastService,
  ) {
    this.data$ = combineLatest([this._raw, this.empresa.selected$]).pipe(
      map(([raw, empId]) => {
        if (!empId) return raw;
        const f = (arr: any[]) => arr.filter((i) => !i.empresa_id || i.empresa_id === empId);
        const filtered = {
          ...raw,
          assets: f(raw.assets),
          domains: f(raw.domains),
          licenses: f(raw.licenses),
          servers: f(raw.servers),
          contracts: f(raw.contracts),
          maintenance: f(raw.maintenance),
          movements: f(raw.movements),
          inventory: f(raw.inventory),
          alerts: f(raw.alerts),
          budgets: f(raw.budgets),
          actions: f(raw.actions),
          accessRecords: f(raw.accessRecords),
          risks: f(raw.risks),
          payments: f(raw.payments),
          dnsRecords: f(raw.dnsRecords),
        };
        const rawTotal = this.totalRows(raw);
        const filteredTotal = this.totalRows(filtered);
        if (rawTotal > 0 && filteredTotal === 0) {
          queueMicrotask(() => this.empresa.setSelected(null));
          return raw;
        }
        return filtered;
      }),
    );
    const onAuth = () => {
      if (!this.api.getToken()) {
        this._raw.next({
          assets: [], domains: [], licenses: [], servers: [], contracts: [],
          maintenance: [], movements: [], inventory: [], alerts: [], budgets: [],
          actions: [], accessRecords: [], risks: [], payments: [], dnsRecords: [], loading: false
        });
        this.lastFetchAt = 0;
        this.fetchComplete = false;
        return;
      }
      void this.empresa.load();
      void this.loadData(true);
    };
    this.api.authChanged$.subscribe(onAuth);
    this.auth.loading$.subscribe((loading) => {
      if (!loading && this.api.getToken()) {
        void this.empresa.load();
        void this.loadData(true);
      }
    });
  }

  loadData(force = false, silent = false): Promise<void> {
    if (!force && this.loadInFlight === null && this.isCacheFresh()) {
      return Promise.resolve();
    }
    if (this.loadInFlight) {
      if (!force) return this.loadInFlight;
      return this.loadInFlight;
    }
    this.loadInFlight = this.fetchDashboard(silent).finally(() => {
      this.loadInFlight = null;
    });
    return this.loadInFlight;
  }

  refreshAfterMutation(): Promise<void> {
    if (this._raw.value.loading) {
      this._raw.next({ ...this._raw.value, loading: false });
    }
    this.lastFetchAt = 0;
    this.fetchComplete = false;
    return this.loadData(true, true);
  }

  applyTableMutation(table: string, rowOrId: unknown, action: 'upsert' | 'delete'): void {
    const key = DashboardService.TABLE_STATE_KEYS[table];
    if (!key) return;

    const current: any = this._raw.value;
    const currentRows = Array.isArray(current[key]) ? current[key] : [];
    const id = typeof rowOrId === 'object' && rowOrId !== null
      ? String((rowOrId as { id?: unknown }).id || '')
      : String(rowOrId || '');
    if (!id) return;

    if (action === 'delete') {
      this._raw.next({
        ...current,
        [key]: currentRows.filter((item: { id?: unknown }) => String(item.id) !== id),
        loading: false,
      });
      return;
    }

    if (!rowOrId || typeof rowOrId !== 'object') return;
    const mapped = (this.mapDashboardPayload({ [table]: [rowOrId as Record<string, unknown>] }) as any)[key]?.[0];
    if (!mapped) return;

    const idx = currentRows.findIndex((item: { id?: unknown }) => String(item.id) === id);
    const nextRows = idx >= 0
      ? currentRows.map((item: { id?: unknown }, i: number) => (i === idx ? mapped : item))
      : [mapped, ...currentRows];

    this._raw.next({
      ...current,
      [key]: nextRows,
      loading: false,
    });
  }

  private isCacheFresh(): boolean {
    return (
      this.fetchComplete &&
      this.lastFetchAt > 0 &&
      Date.now() - this.lastFetchAt < this.cacheMs &&
      this.hasCachedRows()
    );
  }

  private hasCachedRows(): boolean {
    return this.totalRows(this._raw.value) > 0;
  }

  private totalRows(v: {
    assets: unknown[];
    domains: unknown[];
    licenses: unknown[];
    servers: unknown[];
    contracts: unknown[];
    maintenance: unknown[];
    movements: unknown[];
    inventory: unknown[];
    alerts: unknown[];
    budgets: unknown[];
    actions: unknown[];
    accessRecords: unknown[];
    risks: unknown[];
    payments: unknown[];
    dnsRecords: unknown[];
  }): number {
    return (
      v.assets.length +
      v.domains.length +
      v.licenses.length +
      v.servers.length +
      v.contracts.length +
      v.maintenance.length +
      v.movements.length +
      v.inventory.length +
      v.alerts.length +
      v.budgets.length +
      v.actions.length +
      v.accessRecords.length +
      v.risks.length +
      v.payments.length +
      v.dnsRecords.length
    );
  }

  private mapDashboardPayload(d: Record<string, unknown[]>) {
    const attach = <T>(rows: any[] | null | undefined, mapper: (r: any) => T): T[] =>
      (rows || []).map((r) => ({ ...mapper(r), empresa_id: r.empresa_id ?? null } as T));
    const out: Partial<Omit<typeof this._raw.value, 'loading'>> = {};
    if (d['ativos'] !== undefined) out.assets = attach(d['ativos'], this.mapAsset);
    if (d['dominios'] !== undefined) out.domains = attach(d['dominios'], this.mapDomain);
    if (d['licencas'] !== undefined) out.licenses = attach(d['licencas'], this.mapLicense);
    if (d['servidores'] !== undefined) out.servers = attach(d['servidores'], this.mapServer);
    if (d['contratos'] !== undefined) out.contracts = attach(d['contratos'], this.mapContract);
    if (d['manutencoes'] !== undefined) out.maintenance = attach(d['manutencoes'], this.mapMaintenance);
    if (d['movimentacoes'] !== undefined) out.movements = attach(d['movimentacoes'], this.mapMovement);
    if (d['inventario'] !== undefined) out.inventory = attach(d['inventario'], this.mapInventory);
    if (d['alertas'] !== undefined) out.alerts = attach(d['alertas'], this.mapAlert);
    if (d['orcamentos'] !== undefined) out.budgets = attach(d['orcamentos'], this.mapBudget);
    if (d['acoes_economista'] !== undefined) out.actions = attach(d['acoes_economista'], this.mapAction);
    if (d['registros_acesso'] !== undefined) {
      out.accessRecords = attach(d['registros_acesso'], this.mapAccessRecord);
    }
    if (d['riscos'] !== undefined) out.risks = attach(d['riscos'], this.mapRisk);
    if (d['pagamentos'] !== undefined) out.payments = attach(d['pagamentos'], this.mapPayment);
    if (d['dns_records'] !== undefined) out.dnsRecords = attach(d['dns_records'], this.mapDnsRecord);
    return out;
  }

  private async fetchDashboard(silent = false) {
    if (!this.api.getToken()) {
      this._raw.next({
        assets: [], domains: [], licenses: [], servers: [], contracts: [],
        maintenance: [], movements: [], inventory: [], alerts: [], budgets: [],
        actions: [], accessRecords: [], risks: [], payments: [], dnsRecords: [], loading: false
      });
      this.lastFetchAt = 0;
      this.fetchComplete = false;
      return;
    }
    const showSpinner = !silent && !this.hasCachedRows() && !this.fetchComplete;
    if (showSpinner) {
      this._raw.next({ ...this._raw.value, loading: true });
    }
    this.fetchComplete = false;

    try {
      const priority = await firstValueFrom(
        this.api
          .getDashboard([...DashboardService.PRIORITY_TABLES])
          .pipe(timeout(60_000)),
      );
      this._raw.next({
        ...this._raw.value,
        ...this.mapDashboardPayload(priority),
        loading: false,
      });
    } catch (error) {
      console.error('Erro ao carregar dados prioritários do painel:', error);
      this._raw.next({ ...this._raw.value, loading: false });
      this.lastFetchAt = 0;
      this.fetchComplete = false;
      this.showFetchError(error, 'priority');
      return;
    }

    try {
      const background = await firstValueFrom(
        this.api
          .getDashboard([...DashboardService.BACKGROUND_TABLES])
          .pipe(timeout(60_000)),
      );
      this._raw.next({
        ...this._raw.value,
        ...this.mapDashboardPayload(background),
        loading: false,
      });
      this.lastFetchAt = Date.now();
      this.fetchComplete = true;
    } catch (error) {
      console.error('Erro ao carregar dados em segundo plano do painel:', error);
      this._raw.next({ ...this._raw.value, loading: false });
      this.lastFetchAt = 0;
      this.fetchComplete = false;
      this.showFetchError(error, 'background');
    }
  }

  private showFetchError(error: unknown, phase: 'priority' | 'background') {
    let msg = 'Erro ao carregar dados';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        msg = 'API inacessível (porta 3000)';
      } else if (error.error && typeof error.error === 'object' && 'error' in error.error) {
        msg = `${error.status}: ${String((error.error as { error: string }).error)}`;
      } else {
        msg = `HTTP ${error.status}`;
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      msg = String((error as { message: string }).message);
    }
    const offline =
      msg.includes('Timeout') ||
      msg.includes('timeout') ||
      msg.includes('Unknown Error') ||
      msg.includes('0 Unknown');
    const partialHint =
      phase === 'background'
        ? ' O painel principal foi carregado, mas contratos, inventário e outros módulos podem estar incompletos — tente recarregar a página.'
        : '';
    this.toast.show({
      title:
        phase === 'background'
          ? 'Não foi possível carregar todos os módulos'
          : 'Não foi possível carregar os dados',
      description: offline
        ? 'A API não respondeu. Em outro terminal: cd backend && npm run dev (porta 3000). Depois recarregue a página.'
        : msg.includes('401') || msg.includes('403')
          ? 'Sessão inválida ou sem perfil — saia e entre novamente (ex.: dev@local.imts / demo123456).'
          : `Confirme backend/.env (mesmo Postgres do DBeaver). Detalhe: ${msg}${partialHint}`,
      variant: 'destructive',
    });
  }

  private mapAsset(r: any): Asset {
    return {
      id: r.id,
      type: r.tipo || '',
      brand: r.marca || '',
      model: r.modelo || '',
      serialNumber: r.numero_serie || '',
      status: r.status === 'ativo' ? 'Em uso' : r.status === 'estoque' ? 'Estoque' : r.status === 'manutencao' ? 'Manutenção' : r.status === 'descartado' ? 'Aposentado' : '',
      assignedTo: r.assigned_to || null,
      department: r.department_nome || '',
      purchaseDate: r.data_aquisicao || '',
      warrantyEnd: r.warranty_end || '',
      specs: r.specs || {},
      purchaseValue: Number(r.valor_aquisicao || 0),
      maintenanceLog: r.maintenance_log || [],
    };
  }

  private mapDomain(r: any): Domain {
    const exp = r.data_vencimento || '';
    return {
      id: r.id,
      url: r.nome,
      registrar: r.registrar || '',
      expirationDate: exp,
      renewalCost: Number(r.custo_renovacao ?? r.custo_anual ?? 0),
      autoRenew: !!r.auto_renovacao,
      dnsProvider: r.dns_provider || '',
      hostingProvider: r.hosting_provider || '',
      sslExpiration: r.ssl_vencimento || '',
      status: r.status || '',
      observacoes: r.observacoes || '',
    };
  }

  private mapLicense(r: any): License {
    return {
      id: r.id,
      software: r.nome,
      type: r.tipo || '',
      totalLicenses: r.total_licencas || 0,
      usedLicenses: r.qtd_usuarios || 0,
      activationKey: r.chave_ativacao || '',
      costPerUnit: Number(r.custo_unitario || 0),
      monthlyCost: Number(r.custo_mensal || 0),
      renewalDate: r.data_renovacao || '',
      vendor: r.fornecedor || '',
      category: r.categoria || '',
    };
  }

  private mapServer(r: any): Server {
    return {
      id: r.id,
      name: r.nome,
      provider: r.provedor || '',
      type: r.tipo || '',
      region: r.regiao || '',
      ip: r.ip_publico || '',
      os: r.sistema_operacional || '',
      cpu: r.cpu || '',
      ram: r.ram || '',
      storage: r.armazenamento || '',
      status: r.status || '',
      uptime: Number(r.uptime_pct ?? 0),
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
      type: r.type || '',
      status: r.status || 'Ativo',
      costCenter: r.cost_center || '',
      monthlyCost: Number(r.monthly_cost || 0),
      endDate: r.end_date || '',
    };
  }

  private mapDnsRecord(r: any): DnsRecord {
    return {
      id: r.id,
      dominio_id: r.dominio_id,
      tipo: r.tipo || 'A',
      nome: r.nome || '',
      valor: r.valor || '',
      ttl: Number(r.ttl ?? 3600),
      prioridade: r.prioridade != null ? Number(r.prioridade) : null,
      observacoes: r.observacoes ?? null,
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
      resourceType: r.recurso_tipo || '',
      accessLevel: r.nivel_acesso || '',
      grantedDate: r.data_concessao,
      lastAccess: r.ultimo_acesso || '',
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