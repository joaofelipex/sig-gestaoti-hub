import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { WhiteLabelService } from '../services/white-label.service';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';
import { AlertsHeaderButtonComponent } from '../components/alerts-header-button.component';
import { UserMenuComponent } from '../components/user-menu.component';
import { ToastService } from '../services/toast.service';
import { QUICK_SEARCH_ROUTES } from './quick-search.routes';

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [CommonModule, RouterModule, EmpresaSelectorComponent, AlertsHeaderButtonComponent, UserMenuComponent],
  template: `
    <header class="sig-header">
      <div class="sig-header__row">
        <a routerLink="/dashboard" class="sig-header__brand">
          <img *ngIf="wl.logoHorizontal" [src]="wl.logoHorizontal" [alt]="wl.brandName" class="sig-header__logo" />
          <img
            *ngIf="!wl.logoHorizontal && wl.logoIcon"
            [src]="wl.logoIcon"
            [alt]="wl.brandName"
            class="sig-header__logo-icon"
          />
          <span *ngIf="!wl.logoHorizontal && !wl.logoIcon" class="sig-header__logo-icon">{{ initials }}</span>
        </a>

        <button type="button" class="sig-header__menu-btn" (click)="menuToggle.emit()" aria-label="Abrir menu">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>

        <div class="sig-header__search">
          <div class="sig-header__search-wrap">
            <i class="fas fa-search"></i>
            <input
              #quickSearch
              type="search"
              placeholder="Busca rápida…"
              aria-label="Busca rápida"
              (keydown.enter)="goToQuickSearch(quickSearch.value); quickSearch.value = ''"
            />
          </div>
        </div>

        <div class="sig-header__tools">
          <app-empresa-selector />
          <app-alerts-header-button />
          <app-user-menu />
        </div>
      </div>
    </header>
  `,
})
export class AppShellHeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  private readonly quickRoutes = QUICK_SEARCH_ROUTES;

  constructor(
    readonly wl: WhiteLabelService,
    private router: Router,
    private toast: ToastService,
  ) {}

  get initials(): string {
    return this.wl.brandName.slice(0, 1).toUpperCase();
  }

  goToQuickSearch(value: string): void {
    const q = this.normalize(value);
    if (!q) return;
    const route = this.quickRoutes.find((item) => {
      const label = this.normalize(`${item.title} ${item.subtitle ?? ''}`);
      return label.includes(q) || q.includes(this.normalize(item.title));
    });
    if (route) {
      void this.router.navigateByUrl(route.path);
      return;
    }
    this.toast.show({ title: 'Busca rápida', description: 'Nenhum módulo encontrado com esse termo.' });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
