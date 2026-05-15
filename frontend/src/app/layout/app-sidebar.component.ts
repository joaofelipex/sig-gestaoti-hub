import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularComponent } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular/icons/types';
import LayoutDashboard from 'lucide-angular/icons/layout-dashboard';
import Building2 from 'lucide-angular/icons/building-2';
import Laptop from 'lucide-angular/icons/laptop';
import Globe from 'lucide-angular/icons/globe';
import KeyRound from 'lucide-angular/icons/key-round';
import Shield from 'lucide-angular/icons/shield';
import Server from 'lucide-angular/icons/server';
import Wrench from 'lucide-angular/icons/wrench';
import ArrowLeftRight from 'lucide-angular/icons/arrow-left-right';
import Package from 'lucide-angular/icons/package';
import Wallet from 'lucide-angular/icons/wallet';
import BellRing from 'lucide-angular/icons/bell-ring';
import ChartLine from 'lucide-angular/icons/chart-line';
import HeartPulse from 'lucide-angular/icons/heart-pulse';
import ChevronLeft from 'lucide-angular/icons/chevron-left';
import ChevronRight from 'lucide-angular/icons/chevron-right';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIconData;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularComponent],
  template: `
    <aside
      class="hidden md:flex flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300 shadow-xl transition-all duration-300 h-screen sticky top-0"
      [class]="collapsed ? 'w-[72px]' : 'w-[248px]'"
    >
      <div
        class="flex h-16 items-center gap-3 border-b border-slate-800/80 px-4"
        [class.justify-center]="collapsed"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-900/40 ring-1 ring-white/10"
        >
          <lucide-icon [img]="logoIcon" [size]="22" class="text-white" />
        </div>
        <div *ngIf="!collapsed" class="min-w-0 flex-1">
          <div class="truncate text-[15px] font-bold tracking-tight text-white">Heartbeat Hub</div>
          <div class="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">IMTS · TI</div>
        </div>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.to"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: item.to === '/dashboard' }"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium leading-snug transition-colors"
          [ngClass]="
            rla.isActive
              ? 'bg-brand-500/15 text-brand-200 ring-1 ring-brand-500/25'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
          "
        >
          <lucide-icon
            [img]="item.icon"
            [size]="18"
            class="shrink-0 opacity-90"
            [class.text-brand-300]="rla.isActive"
          />
          <span *ngIf="!collapsed" class="truncate">{{ item.label }}</span>
        </a>
      </nav>

      <div class="border-t border-slate-800/80 p-2">
        <button
          type="button"
          (click)="toggleCollapsed()"
          class="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-slate-500 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
          [attr.aria-label]="collapsed ? 'Expandir menu' : 'Recolher menu'"
        >
          <lucide-icon [img]="collapsed ? chevronRight : chevronLeft" [size]="18" />
        </button>
      </div>
    </aside>
  `,
  styles: []
})
export class AppSidebarComponent {
  collapsed = false;
  readonly logoIcon = HeartPulse;
  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;

  readonly navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/empresas', label: 'Empresas', icon: Building2 },
    { to: '/ativos', label: 'Ativos (ITAM)', icon: Laptop },
    { to: '/dominios', label: 'Domínios & DNS', icon: Globe },
    { to: '/licencas', label: 'Licenças (SAM)', icon: KeyRound },
    { to: '/governanca', label: 'Governança', icon: Shield },
    { to: '/servidores', label: 'Servidores', icon: Server },
    { to: '/manutencao', label: 'Manutenção', icon: Wrench },
    { to: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
    { to: '/estoque', label: 'Estoque', icon: Package },
    { to: '/pagamentos', label: 'Pagamentos', icon: Wallet },
    { to: '/alertas', label: 'Alertas', icon: BellRing },
    { to: '/economista', label: 'Visão Economista', icon: ChartLine },
  ];

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
