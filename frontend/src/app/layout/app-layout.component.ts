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
    <div class="flex h-screen bg-gray-100">
      <app-sidebar />
      <main class="flex-1 overflow-auto flex flex-col">
        <header class="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div class="text-sm text-gray-500">Holding IMTS — Gestão de TI</div>
          <app-empresa-selector />
        </header>
        <div class="flex-1">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class AppLayoutComponent {}
