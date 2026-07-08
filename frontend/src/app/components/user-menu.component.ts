import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService, MeResponse } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sig-user-menu" [class.is-open]="open">
      <button
        type="button"
        class="sig-user-menu__trigger"
        (click)="toggle()"
        [attr.aria-expanded]="open"
        aria-haspopup="true"
        aria-label="Menu do utilizador"
      >
        <span class="sig-user-menu__avatar">
          <img *ngIf="avatarUrl" [src]="avatarUrl" alt="" />
          <span *ngIf="!avatarUrl">{{ initials }}</span>
        </span>
        <span class="sig-user-menu__name d-none d-md-inline">{{ displayName }}</span>
        <i class="fas fa-chevron-down sig-user-menu__chevron" aria-hidden="true"></i>
      </button>

      <div *ngIf="open" class="sig-user-menu__dropdown" role="menu">
        <div class="sig-user-menu__info">
          <strong>{{ displayName }}</strong>
          <small>{{ email }}</small>
        </div>
        <hr />
        <a routerLink="/configuracoes" class="sig-user-menu__item" role="menuitem" (click)="close()">
          <i class="fas fa-user-cog" aria-hidden="true"></i>
          Configurações
        </a>
        <button type="button" class="sig-user-menu__item sig-user-menu__item--danger" role="menuitem" (click)="signOut()">
          <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
          Sair
        </button>
      </div>
    </div>
  `,
})
export class UserMenuComponent implements OnInit, OnDestroy {
  open = false;
  me: MeResponse | null = null;
  private sub?: Subscription;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private el: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    void this.loadProfile();
    this.sub = this.api.authChanged$.subscribe(() => void this.loadProfile());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get displayName(): string {
    return this.me?.profile?.nome || 'Utilizador';
  }

  get email(): string {
    return this.me?.profile?.email || this.auth.user?.email || '';
  }

  get avatarUrl(): string | null {
    return this.me?.profile?.avatar_url || null;
  }

  get initials(): string {
    const nome = this.displayName;
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return nome.slice(0, 2).toUpperCase();
  }

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
  }

  async signOut(): Promise<void> {
    this.close();
    await this.auth.signOut();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private async loadProfile(): Promise<void> {
    if (!this.api.getToken()) {
      this.me = null;
      return;
    }
    try {
      this.me = await firstValueFrom(this.api.me());
    } catch {
      this.me = null;
    }
  }
}
