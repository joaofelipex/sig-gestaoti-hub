import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, AccessRecord, RiskItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Governança</h1>

      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              (click)="activeTab = 'access'"
              [class]="activeTab === 'access' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Matriz de Acessos
            </button>
            <button
              (click)="activeTab = 'risks'"
              [class]="activeTab === 'risks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Riscos
            </button>
          </nav>
        </div>
      </div>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <!-- Access Records Tab -->
      <div *ngIf="!loading && activeTab === 'access'">
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurso</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível de Acesso</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acesso</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of accessRecords" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.user }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.resource }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.resourceType }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class]="getAccessLevelClass(record.accessLevel)">
                    {{ record.accessLevel }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class]="record.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ record.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.lastAccess | date:'dd/MM/yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Risks Tab -->
      <div *ngIf="!loading && activeTab === 'risks'">
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidade</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mitigação</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let risk of risks" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ risk.title }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class]="getSeverityClass(risk.severity)">
                    {{ risk.severity }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ risk.owner || 'N/A' }}</td>
                <td class="px-6 py-4 text-sm text-gray-500">{{ risk.mitigation || 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class GovernanceComponent implements OnInit, OnDestroy {
  accessRecords: AccessRecord[] = [];
  risks: RiskItem[] = [];
  loading = true;
  activeTab = 'access';
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.accessRecords = data.accessRecords;
      this.risks = data.risks;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getAccessLevelClass(level: string): string {
    switch (level) {
      case 'Administrador': return 'bg-red-100 text-red-800';
      case 'Escrita': return 'bg-yellow-100 text-yellow-800';
      case 'Leitura': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'Crítico': return 'bg-red-100 text-red-800';
      case 'Alto': return 'bg-orange-100 text-orange-800';
      case 'Médio': return 'bg-yellow-100 text-yellow-800';
      case 'Baixo': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}