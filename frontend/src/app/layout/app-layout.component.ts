import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ApiStatusBannerComponent } from '../components/api-status-banner.component';
import { AppShellHeaderComponent } from './app-shell-header.component';
import { AppShellSidebarComponent } from './app-shell-sidebar.component';

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
export class AppLayoutComponent {
  sidebarCollapsed = false;
  mobileNavOpen = false;

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
