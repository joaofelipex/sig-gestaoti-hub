import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sig-sidebar">
      <nav class="sig-sidebar__nav" aria-label="Menu lateral">
        <div *ngFor="let group of navGroups">
          <div class="sig-sidebar__group-label">{{ group.label }}</div>
          <a
            *ngFor="let item of group.items"
            [routerLink]="item.to"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.to === '/dashboard' }"
            class="sig-sidebar__link"
            (click)="navClick.emit()"
          >
            <i [class]="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </a>
        </div>
      </nav>
      <button type="button" class="sig-sidebar__toggle d-none d-md-block" (click)="collapseToggle.emit()" [attr.aria-label]="collapsed ? 'Expandir menu' : 'Recolher menu'">
        <i class="fas" [class.fa-angle-double-left]="!collapsed" [class.fa-angle-double-right]="collapsed"></i>
      </button>
    </aside>
  `,
})
export class AppShellSidebarComponent {
  @Input() collapsed = false;
  @Output() collapseToggle = new EventEmitter<void>();
  @Output() navClick = new EventEmitter<void>();

  readonly navGroups: NavGroup[] = [
    {
      label: 'Visão',
      items: [
        { to: '/dashboard', label: 'Painel', icon: 'fas fa-chart-pie' },
        { to: '/economista', label: 'Economista', icon: 'fas fa-chart-line' },
      ],
    },
    {
      label: 'Organização',
      items: [{ to: '/empresas', label: 'Empresas', icon: 'fas fa-building' }],
    },
    {
      label: 'Ativos & infra',
      items: [
        { to: '/ativos', label: 'Ativos (ITAM)', icon: 'fas fa-laptop' },
        { to: '/dominios', label: 'Domínios & DNS', icon: 'fas fa-globe' },
        { to: '/licencas', label: 'Licenças (SAM)', icon: 'fas fa-key' },
        { to: '/servidores', label: 'Servidores', icon: 'fas fa-server' },
      ],
    },
    {
      label: 'Operações',
      items: [
        { to: '/manutencao', label: 'Manutenção', icon: 'fas fa-wrench' },
        { to: '/movimentacoes', label: 'Movimentações', icon: 'fas fa-exchange-alt' },
        { to: '/estoque', label: 'Estoque', icon: 'fas fa-boxes' },
      ],
    },
    {
      label: 'Controle',
      items: [
        { to: '/governanca', label: 'Governança', icon: 'fas fa-shield-alt' },
        { to: '/pagamentos', label: 'Pagamentos', icon: 'fas fa-wallet' },
        { to: '/alertas', label: 'Alertas', icon: 'fas fa-bell' },
        { to: '/dados-base', label: 'Dados & base', icon: 'fas fa-database' },
      ],
    },
  ];
}
