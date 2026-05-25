import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WhiteLabelService } from '../services/white-label.service';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';
import { AlertsHeaderButtonComponent } from '../components/alerts-header-button.component';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, EmpresaSelectorComponent, AlertsHeaderButtonComponent],
  template: `
    <header class="app-shell__masthead">
      <a routerLink="/dashboard" class="app-shell__brand">
        <span class="app-shell__brand-mark">
          <img *ngIf="wl.logoUrl" [src]="wl.logoUrl" [alt]="wl.brandName" />
          <span *ngIf="!wl.logoUrl">{{ initials }}</span>
        </span>
        <span class="app-shell__brand-text">
          <span class="app-shell__brand-name">{{ wl.brandName }}</span>
          <span class="app-shell__brand-sub">{{ wl.brandSubtitle }}</span>
        </span>
      </a>

      <div class="app-shell__tools">
        <button
          type="button"
          class="app-shell__menu-btn"
          (click)="mobileNavOpen = !mobileNavOpen"
          [attr.aria-expanded]="mobileNavOpen"
          aria-label="Abrir menu de módulos"
        >
          <i class="fas fa-th-large"></i>
        </button>
        <div class="app-shell__empresa">
          <app-empresa-selector />
        </div>
        <app-alerts-header-button />
      </div>
    </header>

    <div class="app-shell__nav-wrap" [class.is-open]="mobileNavOpen">
      <nav class="app-shell__nav" aria-label="Módulos do sistema">
        <div class="app-shell__nav-group" *ngFor="let group of navGroups">
          <span class="app-shell__nav-group-label">{{ group.label }}</span>
          <a
            *ngFor="let item of group.items"
            [routerLink]="item.to"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.to === '/dashboard' }"
            class="app-shell__nav-link"
            (click)="mobileNavOpen = false"
          >
            <i [class]="item.icon" aria-hidden="true"></i>
            {{ item.label }}
          </a>
        </div>
      </nav>
    </div>
  `,
})
export class AppTopNavComponent {
  mobileNavOpen = false;

  readonly navGroups: NavGroup[] = [
    {
      label: 'Visão',
      items: [
        { to: '/dashboard', label: 'Painel', icon: 'fas fa-chart-pie' },
        { to: '/economista', label: 'Economista', icon: 'fas fa-chart-line' },
      ],
    },
    {
      label: 'Organização',
      items: [{ to: '/empresas', label: 'Empresas', icon: 'fas fa-building' }],
    },
    {
      label: 'Ativos & infra',
      items: [
        { to: '/ativos', label: 'Ativos', icon: 'fas fa-laptop' },
        { to: '/dominios', label: 'Domínios', icon: 'fas fa-globe' },
        { to: '/licencas', label: 'Licenças', icon: 'fas fa-key' },
        { to: '/servidores', label: 'Servidores', icon: 'fas fa-server' },
      ],
    },
    {
      label: 'Operações',
      items: [
        { to: '/manutencao', label: 'Manutenção', icon: 'fas fa-wrench' },
        { to: '/movimentacoes', label: 'Movimentações', icon: 'fas fa-exchange-alt' },
        { to: '/estoque', label: 'Estoque', icon: 'fas fa-boxes' },
      ],
    },
    {
      label: 'Controle',
      items: [
        { to: '/governanca', label: 'Governança', icon: 'fas fa-shield-alt' },
        { to: '/pagamentos', label: 'Pagamentos', icon: 'fas fa-wallet' },
        { to: '/alertas', label: 'Alertas', icon: 'fas fa-bell' },
      ],
    },
  ];

  constructor(readonly wl: WhiteLabelService) {}

  get initials(): string {
    return this.wl.brandName.slice(0, 1).toUpperCase();
  }
}
