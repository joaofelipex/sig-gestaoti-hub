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
    <div class="flex min-h-screen bg-gray-100">
      <app-sidebar />
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          class="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3 shadow-sm"
        >
          <div class="min-w-0 text-sm text-gray-500">Holding IMTS — Gestão de TI</div>
          <app-empresa-selector />
        </header>
        <div class="flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class AppLayoutComponent {}
