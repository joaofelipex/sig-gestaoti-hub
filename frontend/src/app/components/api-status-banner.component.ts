import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap, timeout } from 'rxjs/operators';
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
        <strong>Conexão instável com a API.</strong>
        Se persistir, verifique o backend na porta 3000.
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
  private healthSub?: Subscription;
  private authSub?: Subscription;
  private healthFailures = 0;

  get showBanner(): boolean {
    return !this.apiOk || (this.apiOk && !this.hasToken);
  }

  constructor(
    private api: ApiService,
    private dashboard: DashboardService,
  ) {}

  ngOnInit(): void {
    this.hasToken = !!this.api.getToken();
    this.healthSub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.getHealth().pipe(
            timeout(5000),
            catchError(() => of(null)),
          ),
        ),
      )
      .subscribe({
        next: (h) => {
          const wasOk = this.apiOk;
          if (h?.ok) {
            this.healthFailures = 0;
            this.apiOk = true;
          } else {
            this.healthFailures += 1;
            this.apiOk = this.healthFailures < 2;
          }
          this.hasToken = !!this.api.getToken();
          if (this.apiOk && !wasOk && this.hasToken) {
            void this.dashboard.loadData(true);
          }
        },
      });
    this.authSub = this.api.authChanged$.subscribe(() => {
      this.hasToken = !!this.api.getToken();
      if (this.hasToken && this.apiOk) {
        void this.dashboard.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    this.healthSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }
}
