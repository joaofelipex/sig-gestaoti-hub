import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { WhiteLabelService } from '../services/white-label.service';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';
import { AlertsHeaderButtonComponent } from '../components/alerts-header-button.component';
import { UserMenuComponent } from '../components/user-menu.component';
import { ToastService } from '../services/toast.service';
import { BrowserTabsService } from '../services/browser-tabs.service';
import { BROWSER_TAB_ROUTES, BrowserTabDef } from './browser-tabs.config';

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

      <nav class="sig-tabs" aria-label="Abas abertas" role="tablist">
        <div
          *ngFor="let tab of openTabs; trackBy: trackTab"
          class="sig-tab"
          role="presentation"
          [class.is-active]="isActive(tab.path)"
        >
          <a
            class="sig-tab__link"
            [routerLink]="tab.path"
            role="tab"
            [attr.aria-selected]="isActive(tab.path)"
            (click)="activateTab(tab.path)"
          >
            <i *ngIf="tab.icon" [class]="tab.icon" class="sig-tab__icon" aria-hidden="true"></i>
            <span class="sig-tab__title">{{ tab.title }}</span>
            <small *ngIf="tab.subtitle" class="sig-tab__subtitle">{{ tab.subtitle }}</small>
          </a>
          <button
            type="button"
            class="sig-tab__close"
            (click)="closeTab(tab.path, $event)"
            [disabled]="openTabs.length <= 1"
            [attr.aria-label]="'Fechar aba ' + tab.title"
            title="Fechar aba"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </nav>
    </header>
  `,
})
export class AppShellHeaderComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  openTabs: BrowserTabDef[] = [];

  private readonly quickRoutes = BROWSER_TAB_ROUTES;

  constructor(
    readonly wl: WhiteLabelService,
    private router: Router,
    private toast: ToastService,
    private browserTabs: BrowserTabsService,
  ) {}

  ngOnInit(): void {
    combineLatest([this.browserTabs.openPaths$, this.browserTabs.activePath$]).subscribe(() => {
      this.openTabs = this.browserTabs.openTabs;
    });
    this.openTabs = this.browserTabs.openTabs;
  }

  get initials(): string {
    return this.wl.brandName.slice(0, 1).toUpperCase();
  }

  isActive(path: string): boolean {
    return this.browserTabs.activePath === path;
  }

  trackTab(_index: number, tab: BrowserTabDef): string {
    return tab.path;
  }

  activateTab(path: string): void {
    this.browserTabs.activate(path);
  }

  closeTab(path: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.browserTabs.close(path);
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
