import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';

const TABLE_LABELS: Record<string, string> = {
  empresas: 'Empresas',
  departamentos: 'Departamentos',
  usuarios: 'Utilizadores',
  ativos: 'Ativos',
  dominios: 'Domínios',
  dns_records: 'Registos DNS',
  licencas: 'Licenças',
  servidores: 'Servidores',
  contratos: 'Contratos',
  manutencoes: 'Manutenções',
  movimentacoes: 'Movimentações',
  inventario: 'Inventário',
  inventario_movimentacoes: 'Mov. inventário',
  alertas: 'Alertas',
  orcamentos: 'Orçamentos',
  acoes_economista: 'Ações economista',
  registros_acesso: 'Registos de acesso',
  riscos: 'Riscos',
  pagamentos: 'Pagamentos',
  termos_responsabilidade: 'Termos de responsabilidade',
};

@Component({
  selector: 'app-data-database',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dados &amp; base de dados</h1>
        <p class="mt-1 text-sm text-gray-600">
          Ligações, estado do serviço e contagens da <strong>tua organização</strong> na mesma vista.
        </p>
      </div>

      <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Ligações</h2>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex flex-wrap gap-2">
            <dt class="font-medium text-gray-700">API (Angular)</dt>
            <dd class="font-mono text-gray-900">{{ apiUrl }}</dd>
          </div>
          <div class="flex flex-wrap gap-2">
            <dt class="font-medium text-gray-700">Health</dt>
            <dd class="font-mono text-gray-900">{{ healthUrl }}</dd>
          </div>
          <div class="flex flex-wrap gap-2">
            <dt class="font-medium text-gray-700">Postgres (local típico)</dt>
            <dd class="font-mono text-gray-900">127.0.0.1:5433 · postgres · sig_heartbeat_hub</dd>
          </div>
        </dl>
        <p class="mt-4 text-xs text-gray-500">
          Documentação completa no repositório: <span class="font-mono">docs/dados-e-banco.md</span>
        </p>
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Estado</h2>
          <button
            type="button"
            (click)="refresh()"
            [disabled]="loading"
            class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? 'A atualizar…' : 'Atualizar' }}
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span class="text-gray-600">API / processo</span>
            <span
              class="ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
              [ngClass]="healthOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
            >
              {{ healthOk === null ? '…' : healthOk ? 'OK' : 'Indisponível' }}
            </span>
          </div>
          <div *ngIf="healthError" class="text-xs text-red-600">{{ healthError }}</div>
        </div>
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumo na base (por tabela)</h2>
        <p *ngIf="summaryError" class="mt-2 text-sm text-red-600">{{ summaryError }}</p>
        <div *ngIf="postgresVersion" class="mt-2 text-xs text-gray-500 font-mono break-all">{{ postgresVersion }}</div>
        <div *ngIf="orgId" class="mt-1 text-xs text-gray-600">Organização: <span class="font-mono">{{ orgId }}</span></div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-gray-600">
                <th class="py-2 pr-4 font-medium">Tabela</th>
                <th class="py-2 font-medium">Registos</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of countRows" class="border-b border-gray-100">
                <td class="py-2 pr-4 text-gray-900">{{ row.label }}</td>
                <td class="py-2 font-mono tabular-nums">{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Comandos rápidos (terminal na raiz)</h2>
        <pre class="mt-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">npm run db:up          # Postgres Docker
npm run api:dev        # API Express
cd frontend && npm run dev:local</pre>
      </section>
    </div>
  `,
})
export class DataDatabaseComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;
  readonly healthUrl = `${this.api.getServerRoot()}/health`;

  loading = false;
  healthOk: boolean | null = null;
  healthError: string | null = null;
  summaryError: string | null = null;
  orgId: string | null = null;
  postgresVersion: string | null = null;
  countRows: { key: string; label: string; count: number }[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    void this.refresh();
  }

  async refresh() {
    this.loading = true;
    this.healthError = null;
    this.summaryError = null;
    try {
      const h = await firstValueFrom(this.api.health());
      this.healthOk = !!h?.ok;
    } catch (e) {
      this.healthOk = false;
      this.healthError =
        e instanceof HttpErrorResponse ? e.message || 'Pedido falhou' : 'Não foi possível contactar a API.';
    }
    try {
      const s = await firstValueFrom(this.api.getDataSummary());
      this.orgId = s.org_id;
      this.postgresVersion = s.postgres_version;
      this.countRows = Object.entries(s.counts)
        .map(([key, count]) => ({
          key,
          label: TABLE_LABELS[key] || key,
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt'));
    } catch (e) {
      this.summaryError =
        e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
          ? String((e.error as { error: string }).error)
          : e instanceof HttpErrorResponse
            ? e.message
            : 'Não foi possível ler o resumo da base.';
      this.orgId = null;
      this.postgresVersion = null;
      this.countRows = [];
    } finally {
      this.loading = false;
    }
  }
}
