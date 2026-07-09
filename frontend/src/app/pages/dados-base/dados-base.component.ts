import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService, DataStatusResponse, MeResponse } from '../../services/api.service';

interface HealthState {
  ok: boolean;
  api?: string;
  database?: string;
  postgres?: { database: string; host: string; port: number; configured: string };
  error?: string;
  configured?: string;
}

const TABLE_LABELS: Record<string, string> = {
  empresas: 'Empresas',
  ativos: 'Ativos',
  dominios: 'Domínios',
  licencas: 'Licenças',
  servidores: 'Servidores',
  contratos: 'Contratos',
  manutencoes: 'Manutenções',
  movimentacoes: 'Movimentações',
  inventario: 'Inventário',
  alertas: 'Alertas',
  orcamentos: 'Orçamentos',
  acoes_economista: 'Ações economista',
  registros_acesso: 'Registos de acesso',
  riscos: 'Riscos',
  pagamentos: 'Pagamentos',
  dns_records: 'Registos DNS',
};

@Component({
  selector: 'app-dados-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sig-page">
      <div class="app-page-header">
        <div>
          <h1 class="app-page-title">Dados &amp; base</h1>
          <p class="app-page-sub">Estado da API, PostgreSQL e dados da sua organização</p>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm" (click)="refresh()" [disabled]="loading">
          <i class="fas fa-sync-alt me-1" [class.fa-spin]="loading" aria-hidden="true"></i>
          Atualizar
        </button>
      </div>

      <div *ngIf="loading && !health" class="sig-page-loading">A verificar ligações…</div>

      <ng-container *ngIf="!loading || health">
        <div class="sig-kpi-grid mb-4">
          <article class="sig-kpi-card">
            <div class="sig-kpi-card__body">
              <div>
                <p class="sig-kpi-card__label">API</p>
                <p class="sig-kpi-card__value" [class.text-success]="health?.ok" [class.text-danger]="health && !health.ok">
                  {{ health?.ok ? 'Online' : 'Indisponível' }}
                </p>
                <p class="sig-kpi-card__hint">{{ apiUrl }}</p>
              </div>
              <i class="fas fa-plug sig-kpi-card__icon" aria-hidden="true"></i>
            </div>
          </article>
          <article class="sig-kpi-card">
            <div class="sig-kpi-card__body">
              <div>
                <p class="sig-kpi-card__label">PostgreSQL</p>
                <p class="sig-kpi-card__value" [class.text-success]="health?.database === 'connected' || health?.ok">
                  {{ postgresStatus }}
                </p>
                <p class="sig-kpi-card__hint">{{ postgresLabel || '—' }}</p>
              </div>
              <i class="fas fa-database sig-kpi-card__icon" aria-hidden="true"></i>
            </div>
          </article>
          <article class="sig-kpi-card">
            <div class="sig-kpi-card__body">
              <div>
                <p class="sig-kpi-card__label">Organização</p>
                <p class="sig-kpi-card__value sig-kpi-card__value--sm">{{ me?.profile?.org_nome || '—' }}</p>
                <p class="sig-kpi-card__hint">Escopo: {{ scopeLabel }}</p>
              </div>
              <i class="fas fa-building sig-kpi-card__icon" aria-hidden="true"></i>
            </div>
          </article>
          <article class="sig-kpi-card">
            <div class="sig-kpi-card__body">
              <div>
                <p class="sig-kpi-card__label">Utilizador</p>
                <p class="sig-kpi-card__value sig-kpi-card__value--sm">{{ me?.profile?.nome || '—' }}</p>
                <p class="sig-kpi-card__hint">{{ me?.profile?.email || '—' }}</p>
              </div>
              <i class="fas fa-user sig-kpi-card__icon" aria-hidden="true"></i>
            </div>
          </article>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="sig-chart-panel">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Registos por tabela</h3>
              <span class="sig-chart-panel__meta">{{ totalRecords }} total na org</span>
            </div>
            <div *ngIf="!tableRows.length" class="sig-chart-empty">Sem dados registados</div>
            <table *ngIf="tableRows.length" class="table table-sm sig-table w-full mb-0">
              <thead>
                <tr>
                  <th>Tabela</th>
                  <th class="text-end">Registos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of tableRows">
                  <td>{{ row.label }}</td>
                  <td class="text-end font-medium tabular-nums">{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sig-chart-panel">
            <div class="sig-chart-panel__head">
              <h3 class="sig-chart-title">Comandos úteis</h3>
              <span class="sig-chart-panel__meta">Na raiz do repositório</span>
            </div>
            <ul class="sig-cmd-list">
              <li><code>npm run dev</code> — API (:3000) + Angular (:8080)</li>
              <li><code>npm run db:up</code> — Sobe Postgres Docker (:5432)</li>
              <li><code>npm run doctor</code> — Verifica Postgres + health da API</li>
              <li><code>npm run db:apply-migrations</code> — Aplica migrações SQL</li>
              <li><code>npm run db:seed</code> — Reaplica dados demo</li>
            </ul>
            <p class="text-xs text-gray-500 mt-3 mb-0">
              Documentação completa: <strong>docs/dados-e-banco.md</strong>
            </p>
          </div>
        </div>
      </ng-container>
    </section>
  `,
})
export class DadosBaseComponent implements OnInit {
  loading = true;
  health: HealthState | null = null;
  me: MeResponse | null = null;
  status: DataStatusResponse | null = null;
  apiUrl = environment.apiUrl;

  constructor(private api: ApiService) {}

  ngOnInit() {
    void this.refresh();
  }

  get postgresStatus(): string {
    if (!this.health) return '—';
    if (this.health.database === 'connected') return 'Ligado';
    if (this.health.ok) return 'OK';
    return 'Erro';
  }

  get postgresLabel(): string {
    const pg = this.health?.postgres ?? this.me?.postgres;
    if (pg?.host && pg?.port && pg?.database) {
      return `${pg.host}:${pg.port}/${pg.database}`;
    }
    return pg?.configured ?? '';
  }

  get scopeLabel(): string {
    const scope = this.status?.dataScope ?? this.me?.dataScope ?? 'org';
    return scope === 'org' ? 'Organização (isolado)' : 'Global (dev)';
  }

  get tableRows(): { label: string; count: number }[] {
    if (!this.status?.tableCounts) return [];
    return Object.entries(this.status.tableCounts)
      .map(([key, count]) => ({ label: TABLE_LABELS[key] ?? key, count }))
      .sort((a, b) => b.count - a.count);
  }

  get totalRecords(): number {
    return this.tableRows.reduce((s, r) => s + r.count, 0);
  }

  async refresh() {
    this.loading = true;
    try {
      const [health, me, status] = await Promise.all([
        firstValueFrom(this.api.getHealth()).catch(() => null),
        firstValueFrom(this.api.me()).catch(() => null),
        firstValueFrom(this.api.getDataStatus()).catch(() => null),
      ]);
      this.health = health ?? { ok: false, error: 'API inacessível' };
      this.me = me;
      this.status = status;
    } finally {
      this.loading = false;
    }
  }
}
