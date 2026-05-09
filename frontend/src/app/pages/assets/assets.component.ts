import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Asset } from '../../services/dashboard.service';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Ativos (ITAM)</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atribuído a</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let asset of assets" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ asset.type }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ asset.brand }} {{ asset.model }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class]="getStatusClass(asset.status)">
                  {{ asset.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ asset.assignedTo || 'Não atribuído' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {{ asset.purchaseValue.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class AssetsComponent implements OnInit, OnDestroy {
  assets: Asset[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.assets = data.assets;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Em uso': return 'bg-green-100 text-green-800';
      case 'Estoque': return 'bg-blue-100 text-blue-800';
      case 'Manutenção': return 'bg-yellow-100 text-yellow-800';
      case 'Aposentado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}