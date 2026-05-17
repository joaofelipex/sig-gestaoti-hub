import { Component, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from './app-sidebar.component';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';
import { AlertsHeaderButtonComponent } from '../components/alerts-header-button.component';
import { WhiteLabelService } from '../services/white-label.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppSidebarComponent, EmpresaSelectorComponent, AlertsHeaderButtonComponent],
  template: `
    <div class="wrapper">
      <nav class="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
        <ul class="navbar-nav">
          <li class="nav-item">
            <button
              type="button"
              class="nav-link btn btn-link border-0"
              (click)="toggleSidebar()"
              aria-label="Alternar menu"
            >
              <i class="fas fa-bars"></i>
            </button>
          </li>
          <li class="nav-item d-none d-sm-inline-block">
            <span class="nav-link text-muted mb-0">{{ wl.brandName }} — {{ wl.brandSubtitle }}</span>
          </li>
        </ul>

        <ul class="navbar-nav ms-auto align-items-center">
          <li class="nav-item me-2">
            <app-empresa-selector />
          </li>
          <li class="nav-item">
            <app-alerts-header-button />
          </li>
        </ul>
      </nav>

      <app-sidebar />

      <div class="content-wrapper">
        <section class="content">
          <div class="container-fluid">
            <router-outlet />
          </div>
        </section>
      </div>

      <footer class="main-footer small text-muted">
        <strong>{{ wl.brandName }}</strong> {{ wl.brandSubtitle }}
        <div class="float-end d-none d-sm-inline">SIG Heartbeat Hub</div>
      </footer>
    </div>
  `,
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  readonly wl = inject(WhiteLabelService);
  sidebarCollapsed = false;

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, 'layout-fixed');
    this.renderer.addClass(this.document.body, 'layout-navbar-fixed');
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'layout-fixed');
    this.renderer.removeClass(this.document.body, 'layout-navbar-fixed');
    this.renderer.removeClass(this.document.body, 'sidebar-collapse');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    if (this.sidebarCollapsed) {
      this.renderer.addClass(this.document.body, 'sidebar-collapse');
    } else {
      this.renderer.removeClass(this.document.body, 'sidebar-collapse');
    }
  }
}
