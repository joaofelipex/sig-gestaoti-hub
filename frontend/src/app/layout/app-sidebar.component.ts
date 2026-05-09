import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside
      class="hidden md:flex flex-col bg-white text-gray-900 border-r border-gray-200 transition-all duration-300 h-screen sticky top-0 shadow-sm"
      [class]="collapsed ? 'w-[72px]' : 'w-[232px]'"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 h-16 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-center w-8 h-8 rounded-sm bg-blue-600">
          <span class="text-white font-bold">C</span>
        </div>
        <div *ngIf="!collapsed" class="flex flex-col">
          <span class="text-[15px] font-bold text-blue-600 tracking-normal leading-none">IMTS</span>
          <span class="text-[10px] font-medium text-gray-500 tracking-normal uppercase">Gestão TI</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-3 px-2.5 space-y-1 bg-gray-50">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.to"
          routerLinkActive="bg-white text-blue-600 shadow-sm border border-gray-200"
          class="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium leading-none tracking-normal transition-all text-gray-600 hover:bg-white hover:text-gray-900"
        >
          <span class="w-5 h-5 shrink-0 text-center">{{ item.icon }}</span>
          <span *ngIf="!collapsed">{{ item.label }}</span>
        </a>
      </nav>

      <!-- Collapse toggle -->
      <div class="p-3 border-t border-gray-200 bg-gray-50">
        <button
          (click)="toggleCollapsed()"
          class="flex items-center justify-center w-full py-2 rounded-md text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
        >
          <span class="w-4 h-4">{{ collapsed ? '>' : '<' }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: []
})
export class AppSidebarComponent {
  collapsed = false;

  navItems: NavItem[] = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/ativos', icon: '💻', label: 'Ativos (ITAM)' },
    { to: '/dominios', icon: '🌐', label: 'Domínios & DNS' },
    { to: '/licencas', icon: '🔑', label: 'Licenças (SAM)' },
    { to: '/governanca', icon: '🛡️', label: 'Governança' },
    { to: '/servidores', icon: '☁️', label: 'Servidores' },
    { to: '/manutencao', icon: '🔧', label: 'Manutenção' },
    { to: '/movimentacoes', icon: '↔️', label: 'Movimentações' },
    { to: '/estoque', icon: '📦', label: 'Estoque' },
    { to: '/pagamentos', icon: '💰', label: 'Pagamentos' },
    { to: '/alertas', icon: '🚨', label: 'Alertas' },
    { to: '/economista', icon: '📈', label: 'Visão Economista' },
  ];

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}