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
      routerLinkActive="is-active"
      class="sig-alert-btn"
      [attr.aria-label]="ariaLabel"
      [attr.title]="ariaLabel"
    >
      <i class="far fa-bell" aria-hidden="true"></i>
      <span *ngIf="unreadCount > 0" class="sig-alert-badge">
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
