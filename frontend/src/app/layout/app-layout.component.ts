import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ApiStatusBannerComponent } from '../components/api-status-banner.component';
import { AppShellHeaderComponent } from './app-shell-header.component';
import { AppShellSidebarComponent } from './app-shell-sidebar.component';
import { AlertGenerationService } from '../services/alert-generation.service';

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

  constructor(private alertGen: AlertGenerationService) {}

  ngOnInit(): void {
    this.alertGen.startAutoSync();
  }

  ngOnDestroy(): void {
    this.alertGen.stopAutoSync();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
    this.syncBodyScrollLock();
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
    this.syncBodyScrollLock();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && this.mobileNavOpen) {
      this.closeMobileNav();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileNavOpen) {
      this.closeMobileNav();
    }
  }

  private syncBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = this.mobileNavOpen ? 'hidden' : '';
  }
}
