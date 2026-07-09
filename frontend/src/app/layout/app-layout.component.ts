import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiStatusBannerComponent } from '../components/api-status-banner.component';
import { AppShellHeaderComponent } from './app-shell-header.component';
import { AppShellSidebarComponent } from './app-shell-sidebar.component';
import { AlertGenerationService } from '../services/alert-generation.service';
import { BrowserTabsService } from '../services/browser-tabs.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ApiStatusBannerComponent, AppShellHeaderComponent, AppShellSidebarComponent],
  template: `
    <app-api-status-banner />
    <div
      class="sig-app"
      [class.is-sidebar-collapsed]="sidebarCollapsed"
      [class.is-mobile-nav-open]="mobileNavOpen"
    >
      <app-shell-header (menuToggle)="toggleMobileNav()" />

      <button
        type="button"
        class="sig-backdrop"
        *ngIf="mobileNavOpen"
        (click)="closeMobileNav()"
        aria-label="Fechar menu"
      ></button>

      <div class="sig-body">
        <app-shell-sidebar
          [collapsed]="sidebarCollapsed"
          (collapseToggle)="sidebarCollapsed = !sidebarCollapsed"
          (navClick)="closeMobileNav()"
        />
        <main class="sig-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  mobileNavOpen = false;
  private routerSub?: Subscription;

  constructor(
    private alertGen: AlertGenerationService,
    private router: Router,
    private browserTabs: BrowserTabsService,
  ) {}

  ngOnInit(): void {
    this.alertGen.startAutoSync();
    this.browserTabs.syncFromUrl(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.browserTabs.syncFromUrl(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.alertGen.stopAutoSync();
    this.routerSub?.unsubscribe();
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && this.mobileNavOpen) {
      this.closeMobileNav();
    }
  }
}
