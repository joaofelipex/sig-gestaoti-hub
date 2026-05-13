import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./layout/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'ativos', loadComponent: () => import('./pages/assets/assets.component').then(m => m.AssetsComponent) },
      { path: 'dominios', loadComponent: () => import('./pages/domains/domains.component').then(m => m.DomainsComponent) },
      { path: 'licencas', loadComponent: () => import('./pages/licenses/licenses.component').then(m => m.LicensesComponent) },
      { path: 'servidores', loadComponent: () => import('./pages/servers/servers.component').then(m => m.ServersComponent) },
      { path: 'manutencao', loadComponent: () => import('./pages/maintenance/maintenance.component').then(m => m.MaintenanceComponent) },
      { path: 'movimentacoes', loadComponent: () => import('./pages/movements/movements.component').then(m => m.MovementsComponent) },
      { path: 'estoque', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: 'alertas', loadComponent: () => import('./pages/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'economista', loadComponent: () => import('./pages/economist/economist.component').then(m => m.EconomistComponent) },
      { path: 'governanca', loadComponent: () => import('./pages/governance/governance.component').then(m => m.GovernanceComponent) },
      { path: 'pagamentos', loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent) },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
