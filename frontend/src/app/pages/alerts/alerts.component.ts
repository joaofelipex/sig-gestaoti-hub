import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, Alert } from '../../services/dashboard.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Alertas</h1>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="space-y-4">
        <div *ngFor="let alert of alerts" class="bg-white rounded-lg shadow p-4 border-l-4"
             [class]="getAlertBorderClass(alert.severidade)">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-lg font-semibold text-gray-900">{{ alert.titulo }}</h3>
                <span class="px-2 py-1 text-xs font-medium rounded-full"
                      [class]="getSeverityClass(alert.severidade)">
                  {{ getSeverityLabel(alert.severidade) }}
                </span>
                <span *ngIf="!alert.lida" class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Não lida
                </span>
              </div>
              <p *ngIf="alert.mensagem" class="text-gray-600 mb-2">{{ alert.mensagem }}</p>
              <div class="text-sm text-gray-500">
                <span>Tipo: {{ alert.tipo }}</span>
                <span class="mx-2">•</span>
                <span>{{ alert.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
            <div *ngIf="alert.link" class="ml-4">
              <a [href]="alert.link" target="_blank"
                 class="text-blue-600 hover:text-blue-800 underline text-sm">
                Ver mais
              </a>
            </div>
          </div>
        </div>

        <div *ngIf="alerts.length === 0" class="text-center text-gray-500 py-8">
          Nenhum alerta encontrado.
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AlertsComponent implements OnInit, OnDestroy {
  alerts: Alert[] = [];
  loading = true;
  private subscription!: Subscription;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.alerts = data.alerts;
      this.loading = data.loading;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getAlertBorderClass(severidade: string): string {
    switch (severidade) {
      case 'critico': return 'border-red-500';
      case 'aviso': return 'border-yellow-500';
      case 'info': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  }

  getSeverityClass(severidade: string): string {
    switch (severidade) {
      case 'critico': return 'bg-red-100 text-red-800';
      case 'aviso': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSeverityLabel(severidade: string): string {
    switch (severidade) {
      case 'critico': return 'Crítico';
      case 'aviso': return 'Aviso';
      case 'info': return 'Info';
      default: return severidade;
    }
  }
}