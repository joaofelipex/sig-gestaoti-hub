import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService, Asset, Domain, License, Server, FinancialContract } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-gray-600">Bem-vindo, {{ user?.email }}</p>
      </div>

      <div *ngIf="loading" class="text-center">Carregando...</div>

      <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg shadow">
          <div class="flex items-center">
            <span class="text-2xl">❤️</span>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Health Score</p>
              <p class="text-2xl font-bold">{{ healthScore }}%</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow">
          <div class="flex items-center">
            <span class="text-2xl">💻</span>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Ativos em Uso</p>
              <p class="text-2xl font-bold">{{ assetsInUse }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow">
          <div class="flex items-center">
            <span class="text-2xl">🌐</span>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Domínios Expirando</p>
              <p class="text-2xl font-bold">{{ domainsExpiring }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow">
          <div class="flex items-center">
            <span class="text-2xl">🔑</span>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Licenças Não Usadas</p>
              <p class="text-2xl font-bold">{{ unusedLicenses }}</p>
            </div>
          </div>
        </div>
      </div>

      <button (click)="logout()" class="bg-red-600 text-white px-4 py-2 rounded">Logout</button>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit, OnDestroy {
  get user() { return this.authService.user; }
  data: { assets: Asset[]; domains: Domain[]; licenses: License[]; servers: Server[]; contracts: FinancialContract[]; loading: boolean } = {
    assets: [], domains: [], licenses: [], servers: [], contracts: [], loading: true
  };
  loading = true;
  healthScore = 0;
  assetsInUse = 0;
  domainsExpiring = 0;
  unusedLicenses = 0;

  private subscription!: Subscription;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.subscription = this.dashboardService.data$.subscribe(data => {
      this.data = data;
      this.loading = data.loading;
      if (!data.loading) {
        this.calculateMetrics();
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private calculateMetrics() {
    const { assets, domains, licenses } = this.data;

    const days = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 999;
    this.domainsExpiring = domains.filter(d => d.expirationDate && days(d.expirationDate) > 0 && days(d.expirationDate) <= 30).length;
    this.assetsInUse = assets.filter(a => a.status === 'Em uso').length;
    this.unusedLicenses = licenses.reduce((s, l) => s + Math.max(0, l.totalLicenses - l.usedLicenses), 0);

    let score = 100;
    score -= this.domainsExpiring * 10;
    score -= assets.filter(a => a.status === 'Em uso' && !a.assignedTo).length * 15;
    score -= domains.filter(d => d.status === 'Expirado').length * 20;
    this.healthScore = Math.max(0, Math.min(100, score));
  }

  async logout() {
    await this.authService.signOut();
  }
}