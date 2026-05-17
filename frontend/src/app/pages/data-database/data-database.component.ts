import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService, DataSummaryResponse } from '../../services/api.service';

@Component({
  selector: 'app-data-database',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dados &amp; base</h1>
        <p class="text-sm text-gray-500 mt-1">
          Resumo das tabelas da sua organização no PostgreSQL (via API).
        </p>
      </div>

      <div *ngIf="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {{ error }}
      </div>

      <div *ngIf="loading" class="text-center py-12 text-gray-500">A carregar…</div>

      <ng-container *ngIf="!loading && summary">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Organização</div>
            <div class="mt-1 font-mono text-sm text-gray-900 break-all">{{ summary.org_id }}</div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Perfil</div>
            <div class="mt-1 text-sm text-gray-900">{{ summary.profile_email }}</div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-xs font-medium uppercase tracking-wide text-gray-500">PostgreSQL</div>
          <div class="mt-1 text-sm text-gray-700">{{ summary.postgres_version }}</div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <h2 class="text-sm font-semibold text-gray-900">Contagens por tabela</h2>
          </div>
          <div class="max-h-[560px] overflow-y-auto">
            <table class="min-w-full text-sm">
              <thead class="sticky top-0 bg-white border-b border-gray-200">
                <tr>
                  <th class="text-left px-4 py-2 font-medium text-gray-600">Tabela</th>
                  <th class="text-right px-4 py-2 font-medium text-gray-600">Registos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of countRows" class="border-b border-gray-50 hover:bg-gray-50">
                  <td class="px-4 py-2 font-mono text-gray-800">{{ row.key }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-gray-900">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class DataDatabaseComponent implements OnInit, OnDestroy {
  summary: DataSummaryResponse | null = null;
  loading = true;
  error: string | null = null;
  countRows: { key: string; value: number }[] = [];
  private sub?: Subscription;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.sub = this.api.authChanged$.subscribe(() => {
      void this.load();
    });
    void this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async load(): Promise<void> {
    if (!this.api.getToken()) {
      this.loading = false;
      this.summary = null;
      this.countRows = [];
      this.error = null;
      return;
    }
    this.loading = true;
    this.error = null;
    try {
      const s = await firstValueFrom(this.api.getSummary());
      this.summary = s;
      this.countRows = Object.entries(s.counts)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => a.key.localeCompare(b.key));
    } catch (e: unknown) {
      this.summary = null;
      this.countRows = [];
      this.error = e instanceof Error ? e.message : 'Não foi possível carregar o resumo.';
    } finally {
      this.loading = false;
    }
  }
}
