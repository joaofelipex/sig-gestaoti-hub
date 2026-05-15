import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from './app-sidebar.component';
import { EmpresaSelectorComponent } from '../components/empresa-selector.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppSidebarComponent, EmpresaSelectorComponent],
  template: `
    <div class="flex min-h-screen bg-slate-100/90">
      <app-sidebar />
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          class="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-5 py-3 shadow-sm backdrop-blur-md md:px-8"
        >
          <div class="min-w-0">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-brand-600">Holding IMTS</div>
            <div class="truncate text-sm font-medium text-slate-600">Gestão unificada de tecnologia</div>
          </div>
          <app-empresa-selector />
        </header>
        <div class="flex-1 overflow-auto bg-gradient-to-br from-slate-100 via-white to-brand-50/30">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class AppLayoutComponent {}
