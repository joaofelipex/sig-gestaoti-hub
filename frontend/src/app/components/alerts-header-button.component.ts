import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Alert, DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-alerts-header-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a
      routerLink="/alertas"
      routerLinkActive="active"
      class="nav-link position-relative d-inline-flex align-items-center gap-1"
      [attr.aria-label]="ariaLabel"
      [attr.title]="ariaLabel"
    >
      <i class="far fa-bell"></i>
      <span class="d-none d-md-inline">Alertas</span>
      <span
        *ngIf="unreadCount > 0"
        class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </a>
  `,
})
export class AlertsHeaderButtonComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private sub?: Subscription;

  constructor(private dashboard: DashboardService) {}

  get ariaLabel(): string {
    return this.unreadCount > 0 ? `Alertas (${this.unreadCount} não lidos)` : 'Alertas';
  }

  ngOnInit(): void {
    this.sub = this.dashboard.data$.subscribe((d) => {
      this.unreadCount = d.alerts.filter((a: Alert) => !a.lida).length;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
