import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from './app-sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppSidebarComponent],
  template: `
    <div class="flex h-screen bg-gray-100">
      <app-sidebar />
      <main class="flex-1 overflow-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: []
})
export class AppLayoutComponent {}