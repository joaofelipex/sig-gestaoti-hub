import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Domain } from '../../services/dashboard.service';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Domínios & DNS</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domínio</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrador</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renovação</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let domain of domains" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ domain.url }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ domain.registrar }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class]="getStatusClass(domain.status)">
                  {{ domain.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ domain.expirationDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {{ domain.renewalCost.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class DomainsComponent implements OnInit, OnDestroy {
  domains: Domain[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.domains = data.domains;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800';
      case 'Expirando': return 'bg-yellow-100 text-yellow-800';
      case 'Expirado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}