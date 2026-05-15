import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideIconsBridgeModule } from '../lucide-icons-bridge.module';
import { icons, LucideIconData } from 'lucide-angular';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIconData;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideIconsBridgeModule],
  template: `
    <aside
      class="sticky top-0 hidden h-screen flex-col border-r border-gray-200 bg-white text-gray-900 shadow-sm transition-all duration-300 md:flex"
      [class]="collapsed ? 'w-[72px]' : 'w-[232px]'"
    >
      <div
        class="flex h-16 items-center gap-3 border-b border-gray-200 bg-gray-50 px-4"
        [class.justify-center]="collapsed"
      >
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-blue-600">
          <span class="text-sm font-bold leading-none text-white">C</span>
        </div>
        <div *ngIf="!collapsed" class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-bold leading-none tracking-normal text-blue-600">IMTS</span>
          <span class="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-normal text-gray-500">Gestão TI</span>
        </div>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto bg-gray-50 px-2.5 py-3">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium leading-none tracking-normal transition-all"
          [ngClass]="
            navActive(item.to)
              ? 'border border-gray-200 bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:bg-white hover:text-gray-900'
          "
        >
          <lucide-icon
            [img]="item.icon"
            [size]="18"
            class="shrink-0"
            [class.text-blue-600]="navActive(item.to)"
            [class.text-gray-500]="!navActive(item.to)"
          />
          <span *ngIf="!collapsed" class="truncate">{{ item.label }}</span>
        </a>
      </nav>

      <div class="border-t border-gray-200 bg-gray-50 p-3">
        <button
          type="button"
          (click)="toggleCollapsed()"
          class="flex w-full items-center justify-center rounded-md py-2 text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
          [attr.aria-label]="collapsed ? 'Expandir menu' : 'Recolher menu'"
        >
          <lucide-icon [img]="collapsed ? chevronRight : chevronLeft" [size]="16" class="text-gray-500" />
        </button>
      </div>
    </aside>
  `,
  styles: []
})
export class AppSidebarComponent {
  constructor(private router: Router) {}

  collapsed = false;
  readonly chevronLeft = icons.ChevronLeft;
  readonly chevronRight = icons.ChevronRight;

  readonly navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: icons.LayoutDashboard },
    { to: '/dados-banco', label: 'Dados & base', icon: icons.Database },
    { to: '/empresas', label: 'Empresas', icon: icons.Building2 },
    { to: '/ativos', label: 'Ativos (ITAM)', icon: icons.Laptop },
    { to: '/dominios', label: 'Domínios & DNS', icon: icons.Globe },
    { to: '/licencas', label: 'Licenças (SAM)', icon: icons.KeyRound },
    { to: '/governanca', label: 'Governança', icon: icons.Shield },
    { to: '/servidores', label: 'Servidores', icon: icons.Server },
    { to: '/manutencao', label: 'Manutenção', icon: icons.Wrench },
    { to: '/movimentacoes', label: 'Movimentações', icon: icons.ArrowLeftRight },
    { to: '/estoque', label: 'Estoque', icon: icons.Package },
    { to: '/pagamentos', label: 'Pagamentos', icon: icons.Wallet },
    { to: '/alertas', label: 'Alertas', icon: icons.BellRing },
    { to: '/economista', label: 'Visão Economista', icon: icons.ChartLine },
  ];

  navActive(path: string): boolean {
    const exact = path === '/dashboard';
    return this.router.isActive(path, {
      paths: exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: 'ignored',
    });
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
