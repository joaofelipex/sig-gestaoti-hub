import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WhiteLabelService } from '../services/white-label.service';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="main-sidebar sidebar-dark-primary elevation-4">
      <a routerLink="/dashboard" class="brand-link text-center">
        <img
          *ngIf="wl.logoUrl"
          [src]="wl.logoUrl"
          [alt]="wl.brandName"
          class="brand-image wl-logo img-circle elevation-3"
        />
        <span *ngIf="!wl.logoUrl" class="brand-image img-circle elevation-3 bg-white text-primary fw-bold d-inline-flex align-items-center justify-content-center" style="width:33px;height:33px;">
          {{ initials }}
        </span>
        <span class="brand-text fw-light ms-1">
          {{ wl.brandName }}
          <small class="d-block opacity-75" style="font-size:0.65rem">{{ wl.brandSubtitle }}</small>
        </span>
      </a>

      <div class="sidebar">
        <nav class="mt-2">
          <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
            <li class="nav-item" *ngFor="let item of navItems">
              <a
                [routerLink]="item.to"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.to === '/dashboard' }"
                class="nav-link"
              >
                <i class="nav-icon {{ item.icon }}"></i>
                <p>{{ item.label }}</p>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  `,
})
export class AppSidebarComponent {
  readonly navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { to: '/empresas', label: 'Empresas', icon: 'fas fa-building' },
    { to: '/ativos', label: 'Ativos (ITAM)', icon: 'fas fa-laptop' },
    { to: '/dominios', label: 'Domínios & DNS', icon: 'fas fa-globe' },
    { to: '/licencas', label: 'Licenças (SAM)', icon: 'fas fa-key' },
    { to: '/governanca', label: 'Governança', icon: 'fas fa-shield-alt' },
    { to: '/servidores', label: 'Servidores', icon: 'fas fa-server' },
    { to: '/manutencao', label: 'Manutenção', icon: 'fas fa-wrench' },
    { to: '/movimentacoes', label: 'Movimentações', icon: 'fas fa-exchange-alt' },
    { to: '/estoque', label: 'Estoque', icon: 'fas fa-boxes' },
    { to: '/pagamentos', label: 'Pagamentos', icon: 'fas fa-wallet' },
    { to: '/economista', label: 'Visão Economista', icon: 'fas fa-chart-line' },
  ];

  constructor(readonly wl: WhiteLabelService) {}

  get initials(): string {
    return this.wl.brandName.slice(0, 1).toUpperCase();
  }
}
