import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WhiteLabelService } from '../services/white-label.service';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';
import { AlertsHeaderButtonComponent } from '../components/alerts-header-button.component';

export interface SigTab {
  to: string;
  title: string;
  subtitle?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [CommonModule, RouterModule, EmpresaSelectorComponent, AlertsHeaderButtonComponent],
  template: `
    <header class="sig-header">
      <div class="sig-header__row">
        <a routerLink="/dashboard" class="sig-header__brand">
          <img *ngIf="wl.logoHorizontal" [src]="wl.logoHorizontal" [alt]="wl.brandName" class="sig-header__logo" />
          <span *ngIf="!wl.logoHorizontal" class="sig-header__logo-icon">{{ initials }}</span>
        </a>

        <button type="button" class="sig-header__menu-btn" (click)="menuToggle.emit()" aria-label="Abrir menu">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>

        <div class="sig-header__search">
          <div class="sig-header__search-wrap">
            <i class="fas fa-search"></i>
            <input type="search" placeholder="Busca rápida…" aria-label="Busca rápida" />
          </div>
        </div>

        <div class="sig-header__tools">
          <app-empresa-selector />
          <app-alerts-header-button />
        </div>
      </div>

      <nav class="sig-tabs" aria-label="Abas">
        <a
          *ngFor="let tab of tabs"
          [routerLink]="tab.to"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
          class="sig-tab"
        >
          {{ tab.title }}
          <small *ngIf="tab.subtitle">{{ tab.subtitle }}</small>
        </a>
      </nav>
    </header>
  `,
})
export class AppShellHeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly tabs: SigTab[] = [
    { to: '/dashboard', title: 'Painel', subtitle: 'Visão', exact: true },
    { to: '/empresas', title: 'Empresas', subtitle: 'Org.' },
    { to: '/ativos', title: 'Ativos', subtitle: 'ITAM' },
    { to: '/dominios', title: 'Domínios', subtitle: 'DNS' },
    { to: '/licencas', title: 'Licenças', subtitle: 'SAM' },
    { to: '/servidores', title: 'Servidores', subtitle: 'Infra' },
    { to: '/governanca', title: 'Governança', subtitle: 'Gov.' },
    { to: '/pagamentos', title: 'Pagamentos', subtitle: 'Fin.' },
    { to: '/alertas', title: 'Alertas', subtitle: 'Avisos' },
    { to: '/economista', title: 'Economista', subtitle: 'BI' },
  ];

  constructor(readonly wl: WhiteLabelService) {}

  get initials(): string {
    return this.wl.brandName.slice(0, 1).toUpperCase();
  }
}
