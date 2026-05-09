import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, License } from '../../services/dashboard.service';

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Licenças (SAM)</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Software</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Em Uso</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponível</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Unitário</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let license of licenses" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ license.software }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ license.type }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ license.totalLicenses }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ license.usedLicenses }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ license.totalLicenses - license.usedLicenses }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {{ license.costPerUnit.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class LicensesComponent implements OnInit, OnDestroy {
  licenses: License[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.licenses = data.licenses;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}