import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-api-status-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      *ngIf="showBanner"
      class="sig-api-banner"
      [class.sig-api-banner--warn]="apiOk && !hasToken"
      [class.sig-api-banner--danger]="!apiOk"
      role="status"
    >
      <ng-container *ngIf="!apiOk">
        <strong>API offline.</strong>
        Em outro terminal: <code>cd backend && npm run dev</code> (porta 3000). Depois recarregue a página.
      </ng-container>
      <ng-container *ngIf="apiOk && !hasToken">
        <strong>Sessão não iniciada.</strong>
        <a routerLink="/auth">Entrar</a>
        — demonstração: <code>dev@local.imts</code> / <code>demo123456</code> (se existir seed no banco).
      </ng-container>
    </div>
  `,
})
export class ApiStatusBannerComponent implements OnInit, OnDestroy {
  apiOk = true;
  hasToken = false;
  private sub?: Subscription;

  get showBanner(): boolean {
    return !this.apiOk || (this.apiOk && !this.hasToken);
  }

  constructor(
    private api: ApiService,
    private dashboard: DashboardService,
  ) {}

  ngOnInit(): void {
    this.hasToken = !!this.api.getToken();
    this.sub = interval(8000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getHealth()),
      )
      .subscribe({
        next: (h) => {
          const wasOk = this.apiOk;
          this.apiOk = !!h?.ok;
          this.hasToken = !!this.api.getToken();
          if (this.apiOk && !wasOk && this.hasToken) {
            void this.dashboard.loadData(true);
          }
        },
        error: () => {
          this.apiOk = false;
          this.hasToken = !!this.api.getToken();
        },
      });
    this.api.authChanged$.subscribe(() => {
      this.hasToken = !!this.api.getToken();
      if (this.hasToken && this.apiOk) {
        void this.dashboard.loadData(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
