import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Payment } from '../../services/dashboard.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Pagamentos</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competência</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let payment of payments" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ payment.nome }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getCategoryLabel(payment.categoria) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ payment.competencia }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {{ payment.valor.toLocaleString() }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class]="getStatusClass(payment.status)">
                  {{ getStatusLabel(payment.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ payment.vencimento ? (payment.vencimento | date:'dd/MM/yyyy') : 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ payment.fornecedor || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class PaymentsComponent implements OnInit, OnDestroy {
  payments: Payment[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.payments = data.payments;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getCategoryLabel(categoria: string): string {
    switch (categoria) {
      case 'servidor': return 'Servidor';
      case 'licenca': return 'Licença';
      case 'dominio': return 'Domínio';
      case 'contrato': return 'Contrato';
      case 'outro': return 'Outro';
      default: return categoria;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'pago': return 'Pago';
      case 'atrasado': return 'Atrasado';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'atrasado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}