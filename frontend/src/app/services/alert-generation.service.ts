import { Injectable } from '@angular/core';
import { Subscription, debounceTime, filter, firstValueFrom, take } from 'rxjs';
import { DashboardService, Alert } from './dashboard.service';
import { CrudService } from './crud.service';
import { ApiService } from './api.service';

export interface AlertDraft {
  titulo: string;
  mensagem: string;
  tipo: string;
  severidade: 'info' | 'aviso' | 'critico';
  link?: string;
  refKey: string;
}

type DashboardSnapshot = {
  domains: any[];
  licenses: any[];
  servers: any[];
  payments: any[];
  contracts: any[];
  maintenance: any[];
  inventory: any[];
  assets: any[];
  risks: any[];
  alerts: Alert[];
  loading: boolean;
};

@Injectable({ providedIn: 'root' })
export class AlertGenerationService {
  private syncInFlight = false;
  private autoSyncSub?: Subscription;

  constructor(
    private dashboard: DashboardService,
    private crud: CrudService,
    private api: ApiService,
  ) {}

  startAutoSync(): void {
    this.autoSyncSub?.unsubscribe();
    this.autoSyncSub = this.dashboard.data$
      .pipe(
        filter((data) => !data.loading && this.hasSourceData(data)),
        debounceTime(400),
      )
      .subscribe(() => {
        void this.sync({ silent: true });
      });
  }

  stopAutoSync(): void {
    this.autoSyncSub?.unsubscribe();
    this.autoSyncSub = undefined;
  }

  async sync(options: { silent?: boolean } = {}): Promise<number> {
    if (this.syncInFlight) return 0;
    this.syncInFlight = true;
    try {
      const data = await firstValueFrom(this.dashboard.data$.pipe(take(1))) as DashboardSnapshot;
      if (!this.hasSourceData(data)) return 0;
      await this.syncOverduePayments(data.payments);
      const drafts = this.buildDrafts({ ...data, contracts: data.contracts || [] });
      const existingRefs = this.collectExistingRefs(data.alerts);
      const newAlerts = drafts
        .filter((d) => !existingRefs.has(d.refKey))
        .map((d) => ({
          titulo: d.titulo,
          mensagem: this.formatMensagem(d.refKey, d.mensagem),
          tipo: d.tipo,
          severidade: d.severidade,
          lida: false,
          link: d.link ?? null,
        }));
      if (!newAlerts.length) return 0;
      return await this.crud.bulkInsert('alertas', newAlerts, { silent: options.silent });
    } finally {
      this.syncInFlight = false;
    }
  }

  buildDrafts(data: {
    domains: any[];
    licenses: any[];
    servers: any[];
    payments: any[];
    contracts?: any[];
    maintenance: any[];
    inventory: any[];
    assets: any[];
    risks: any[];
  }): AlertDraft[] {
    const today = new Date();
    const drafts: AlertDraft[] = [];
    const push = (draft: AlertDraft) => drafts.push(draft);

    data.domains.forEach((d) => {
      const url = d.url || d.nome || 'Domínio';
      const id = d.id;
      const notes = (d.observacoes || d.notes || '').trim();
      const status = (d.status || '').trim();

      if (!d.expirationDate) {
        push({
          refKey: `dominio:${id}:sem_vencimento`,
          titulo: 'Domínio sem data de vencimento',
          mensagem: `${url} não tem data de vencimento cadastrada`,
          tipo: 'dominio',
          severidade: 'aviso',
          link: '/dominios',
        });
      } else {
        const days = this.daysUntil(d.expirationDate, today);
        if (!Number.isNaN(days)) {
          if (days <= 0) {
            push({
              refKey: `dominio:${id}:expirado`,
              titulo: 'Domínio expirado',
              mensagem: `${url} venceu em ${this.fmtDate(d.expirationDate)}`,
              tipo: 'dominio',
              severidade: 'critico',
              link: '/dominios',
            });
          } else if (days <= 15) {
            push({
              refKey: `dominio:${id}:vence_breve`,
              titulo: `Domínio expira em ${days} dias`,
              mensagem: `${url} vence em ${this.fmtDate(d.expirationDate)}`,
              tipo: 'dominio',
              severidade: 'critico',
              link: '/dominios',
            });
          } else if (days <= 30) {
            push({
              refKey: `dominio:${id}:vence_30`,
              titulo: `Domínio expira em ${days} dias`,
              mensagem: `${url} vence em ${this.fmtDate(d.expirationDate)}`,
              tipo: 'dominio',
              severidade: 'aviso',
              link: '/dominios',
            });
          }
        }
      }

      if (d.sslExpiration) {
        const sslDays = this.daysUntil(d.sslExpiration, today);
        if (!Number.isNaN(sslDays)) {
          if (sslDays <= 0) {
            push({
              refKey: `dominio:${id}:ssl_expirado`,
              titulo: 'SSL do domínio expirado',
              mensagem: `Certificado SSL de ${url} venceu em ${this.fmtDate(d.sslExpiration)}`,
              tipo: 'dominio',
              severidade: 'critico',
              link: '/dominios',
            });
          } else if (sslDays <= 30) {
            push({
              refKey: `dominio:${id}:ssl_vence`,
              titulo: `SSL do domínio vence em ${sslDays} dias`,
              mensagem: `Certificado SSL de ${url} vence em ${this.fmtDate(d.sslExpiration)}`,
              tipo: 'dominio',
              severidade: sslDays <= 15 ? 'critico' : 'aviso',
              link: '/dominios',
            });
          }
        }
      }

      const problemNote = this.domainProblem(notes, status);
      if (problemNote) {
        push({
          refKey: `dominio:${id}:status_problema`,
          titulo: 'Domínio com pendência',
          mensagem: `${url}: ${problemNote}`,
          tipo: 'dominio',
          severidade: notes.toLowerCase().includes('instalação incompleta') ? 'critico' : 'aviso',
          link: '/dominios',
        });
      }
    });

    data.licenses.forEach((l) => {
      const name = l.software || l.nome || 'Licença';
      const id = l.id;
      const total = Number(l.totalLicenses ?? l.total_licencas ?? 0);
      const used = Number(l.usedLicenses ?? l.qtd_usuarios ?? 0);

      if (!l.renewalDate) {
        push({
          refKey: `licenca:${id}:sem_renovacao`,
          titulo: 'Licença sem data de renovação',
          mensagem: `${name} não tem data de renovação cadastrada`,
          tipo: 'licenca',
          severidade: 'aviso',
          link: '/licencas',
        });
      } else {
        const days = this.daysUntil(l.renewalDate, today);
        if (!Number.isNaN(days)) {
          if (days <= 0) {
            push({
              refKey: `licenca:${id}:expirada`,
              titulo: 'Licença expirada',
              mensagem: `${name} venceu em ${this.fmtDate(l.renewalDate)}`,
              tipo: 'licenca',
              severidade: 'critico',
              link: '/licencas',
            });
          } else if (days <= 15) {
            push({
              refKey: `licenca:${id}:renova_breve`,
              titulo: `Licença renova em ${days} dias`,
              mensagem: `${name} renova em ${this.fmtDate(l.renewalDate)}`,
              tipo: 'licenca',
              severidade: 'critico',
              link: '/licencas',
            });
          } else if (days <= 30) {
            push({
              refKey: `licenca:${id}:renova_30`,
              titulo: `Licença renova em ${days} dias`,
              mensagem: `${name} renova em ${this.fmtDate(l.renewalDate)}`,
              tipo: 'licenca',
              severidade: 'aviso',
              link: '/licencas',
            });
          }
        }
      }

      if (total > 0 && used > total) {
        push({
          refKey: `licenca:${id}:esgotada`,
          titulo: 'Licenças esgotadas',
          mensagem: `${name}: ${used} em uso de ${total} licenças`,
          tipo: 'licenca',
          severidade: 'critico',
          link: '/licencas',
        });
      } else if (total > 0 && used >= total) {
        push({
          refKey: `licenca:${id}:limite`,
          titulo: 'Licenças no limite',
          mensagem: `${name}: ${used}/${total} licenças em uso`,
          tipo: 'licenca',
          severidade: 'aviso',
          link: '/licencas',
        });
      }
    });

    data.servers.forEach((s) => {
      const name = s.name || s.nome || 'Servidor';
      const id = s.id;
      const status = (s.status || '').toLowerCase();

      if (status && !['online', 'ativo', 'active', 'running'].includes(status)) {
        push({
          refKey: `servidor:${id}:offline`,
          titulo: 'Servidor indisponível',
          mensagem: `${name} está com status "${s.status}"`,
          tipo: 'servidor',
          severidade: 'critico',
          link: '/servidores',
        });
      }

      if (s.sslExpiration) {
        const sslDays = this.daysUntil(s.sslExpiration, today);
        if (!Number.isNaN(sslDays)) {
          if (sslDays <= 0) {
            push({
              refKey: `servidor:${id}:ssl_expirado`,
              titulo: 'SSL do servidor expirado',
              mensagem: `Certificado SSL de ${name} venceu em ${this.fmtDate(s.sslExpiration)}`,
              tipo: 'servidor',
              severidade: 'critico',
              link: '/servidores',
            });
          } else if (sslDays <= 30) {
            push({
              refKey: `servidor:${id}:ssl_vence`,
              titulo: `SSL do servidor vence em ${sslDays} dias`,
              mensagem: `${name} — SSL vence em ${this.fmtDate(s.sslExpiration)}`,
              tipo: 'servidor',
              severidade: sslDays <= 15 ? 'critico' : 'aviso',
              link: '/servidores',
            });
          }
        }
      }

      if (s.contractEnd) {
        const contractDays = this.daysUntil(s.contractEnd, today);
        if (!Number.isNaN(contractDays)) {
          if (contractDays <= 0) {
            push({
              refKey: `servidor:${id}:contrato_expirado`,
              titulo: 'Contrato de servidor expirado',
              mensagem: `Contrato de ${name} venceu em ${this.fmtDate(s.contractEnd)}`,
              tipo: 'servidor',
              severidade: 'critico',
              link: '/servidores',
            });
          } else if (contractDays <= 30) {
            push({
              refKey: `servidor:${id}:contrato_vence`,
              titulo: `Contrato de servidor vence em ${contractDays} dias`,
              mensagem: `Contrato de ${name} vence em ${this.fmtDate(s.contractEnd)}`,
              tipo: 'servidor',
              severidade: 'aviso',
              link: '/servidores',
            });
          }
        }
      }
    });

    data.payments.forEach((p) => {
      const name = p.nome || 'Pagamento';
      const id = p.id;
      const status = (p.status || '').toLowerCase();

      if (status === 'atrasado') {
        push({
          refKey: `pagamento:${id}:atrasado`,
          titulo: 'Pagamento atrasado',
          mensagem: `${name} está marcado como atrasado`,
          tipo: 'pagamento',
          severidade: 'critico',
          link: '/pagamentos',
        });
        return;
      }

      if (status === 'pendente' && p.vencimento) {
        const days = this.daysUntil(p.vencimento, today);
        if (!Number.isNaN(days)) {
          if (days < 0) {
            push({
              refKey: `pagamento:${id}:vencido`,
              titulo: 'Pagamento atrasado',
              mensagem: `${name} venceu em ${this.fmtDate(p.vencimento)}`,
              tipo: 'pagamento',
              severidade: 'critico',
              link: '/pagamentos',
            });
          } else if (days <= 7) {
            push({
              refKey: `pagamento:${id}:vence_breve`,
              titulo: `Pagamento vence em ${days} dias`,
              mensagem: `${name} vence em ${this.fmtDate(p.vencimento)}`,
              tipo: 'pagamento',
              severidade: 'aviso',
              link: '/pagamentos',
            });
          }
        }
      }
    });

    data.maintenance.forEach((m) => {
      if (!this.isMaintenanceOpen(m.status)) return;
      push({
        refKey: `manutencao:${m.id}:aberta`,
        titulo: 'Manutenção em aberto',
        mensagem: `${m.tipo || 'Manutenção'} aberta desde ${this.fmtDate(m.data_abertura)}`,
        tipo: 'infra',
        severidade: this.normalizeText(m.status).includes('crit') ? 'critico' : 'aviso',
        link: '/manutencao',
      });
    });

    data.inventory.forEach((item) => {
      const min = Number(item.min_quantity ?? 0);
      const qty = Number(item.quantity ?? 0);
      if (min > 0 && qty <= min) {
        push({
          refKey: `estoque:${item.id}:baixo`,
          titulo: 'Estoque baixo',
          mensagem: `${item.nome}: ${qty} ${item.unit || 'un'} (mínimo ${min})`,
          tipo: 'infra',
          severidade: qty === 0 ? 'critico' : 'aviso',
          link: '/estoque',
        });
      }
    });

    data.assets.forEach((a) => {
      if (!a.warrantyEnd) return;
      const days = this.daysUntil(a.warrantyEnd, today);
      if (Number.isNaN(days)) return;
      const label = [a.brand, a.model].filter(Boolean).join(' ') || a.type || 'Ativo';
      if (days <= 0) {
        push({
          refKey: `ativo:${a.id}:garantia_expirada`,
          titulo: 'Garantia expirada',
          mensagem: `${label} — garantia venceu em ${this.fmtDate(a.warrantyEnd)}`,
          tipo: 'infra',
          severidade: 'aviso',
          link: '/ativos',
        });
      } else if (days <= 30) {
        push({
          refKey: `ativo:${a.id}:garantia_vence`,
          titulo: `Garantia vence em ${days} dias`,
          mensagem: `${label} — garantia vence em ${this.fmtDate(a.warrantyEnd)}`,
          tipo: 'infra',
          severidade: 'info',
          link: '/ativos',
        });
      }
    });

    data.risks.forEach((r) => {
      const severity = (r.severity || '').toLowerCase();
      if (!['alto', 'alta', 'critico', 'crítico', 'critical', 'high'].includes(severity)) return;
      push({
        refKey: `risco:${r.id}:alto`,
        titulo: 'Risco elevado',
        mensagem: r.title || 'Risco sem título',
        tipo: 'infra',
        severidade: 'critico',
        link: '/governanca',
      });
    });

    (data.contracts || []).forEach((c) => {
      if (!c.endDate) return;
      const label = c.object || c.supplier || 'Contrato';
      const days = this.daysUntil(c.endDate, today);
      if (Number.isNaN(days)) return;
      if (days <= 0) {
        push({
          refKey: `contrato:${c.id}:expirado`,
          titulo: 'Contrato expirado',
          mensagem: `${label} venceu em ${this.fmtDate(c.endDate)}`,
          tipo: 'pagamento',
          severidade: 'critico',
          link: '/economista',
        });
      } else if (days <= 30) {
        push({
          refKey: `contrato:${c.id}:vence`,
          titulo: `Contrato vence em ${days} dias`,
          mensagem: `${label} vence em ${this.fmtDate(c.endDate)}`,
          tipo: 'pagamento',
          severidade: 'aviso',
          link: '/economista',
        });
      }
    });

    return drafts;
  }

  extractRef(mensagem: string | null): string | null {
    const match = mensagem?.match(/^\[ref:([^\]]+)\]/);
    return match ? match[1] : null;
  }

  stripRef(mensagem: string | null): string | null {
    if (!mensagem) return mensagem;
    return mensagem.replace(/^\[ref:[^\]]+\]\s*/, '') || null;
  }

  formatMensagem(refKey: string, text: string): string {
    return `[ref:${refKey}] ${text}`;
  }

  private collectExistingRefs(alerts: Alert[]): Set<string> {
    const refs = new Set<string>();
    alerts.forEach((a) => {
      const ref = this.extractRef(a.mensagem);
      if (ref) refs.add(ref);
      refs.add(this.legacyRef(a));
    });
    return refs;
  }

  private legacyRef(a: Alert): string {
    return `legacy:${a.tipo}:${a.titulo}`;
  }

  private hasSourceData(data: {
    domains: unknown[];
    licenses: unknown[];
    servers: unknown[];
    payments: unknown[];
  }): boolean {
    return (
      data.domains.length > 0 ||
      data.licenses.length > 0 ||
      data.servers.length > 0 ||
      data.payments.length > 0
    );
  }

  private async syncOverduePayments(payments: any[]): Promise<void> {
    const today = new Date();
    const overdue = payments.filter(
      (p) => p.status === 'pendente' && p.vencimento && this.daysUntil(p.vencimento, today) < 0,
    );
    if (!overdue.length) return;
    await Promise.all(
      overdue.map(async (p) => {
        await firstValueFrom(this.api.patchTable('pagamentos', p.id, { status: 'atrasado' }));
        this.dashboard.applyTableMutation('pagamentos', { ...p, status: 'atrasado' }, 'upsert');
      }),
    );
  }

  private isMaintenanceOpen(status: string): boolean {
    const s = this.normalizeText(status || '');
    return !['concluida', 'concluido', 'fechada', 'fechado', 'cancelada', 'cancelado'].includes(s);
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  }

  private domainProblem(notes: string, status: string): string | null {
    const text = `${notes} ${status}`.toLowerCase();
    if (!text.trim()) return null;
    if (text.includes('instalação incompleta') || text.includes('instalacao incompleta')) {
      return notes || status;
    }
    if (text.includes('possíveis problemas') || text.includes('possiveis problemas')) {
      return notes || status;
    }
    if (text.includes('problema') || text.includes('pendente') || text.includes('incomplet')) {
      return notes || status;
    }
    return null;
  }

  private daysUntil(dateStr: string, today: Date): number {
    const d = new Date(`${dateStr}`.slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return NaN;
    const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const t1 = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((t1 - t0) / 86400000);
  }

  private fmtDate(dateStr: string): string {
    const d = new Date(`${dateStr}`.slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  }
}
