import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Maintenance } from '../../services/dashboard.service';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Manutenção</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Abertura</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Conclusão</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let item of maintenance" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.tipo }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class]="getStatusClass(item.status)">
                  {{ item.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.data_abertura | date:'dd/MM/yyyy' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.data_conclusao ? (item.data_conclusao | date:'dd/MM/yyyy') : 'Em andamento' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.fornecedor || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.custo ? 'R$ ' + item.custo.toLocaleString() : 'N/A' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  maintenance: Maintenance[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.maintenance = data.maintenance;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Concluída': return 'bg-green-100 text-green-800';
      case 'Em andamento': return 'bg-blue-100 text-blue-800';
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}