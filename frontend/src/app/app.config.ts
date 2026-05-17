import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Lara from '@primeng/themes/lara';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { WhiteLabelService } from './services/white-label.service';
import { environment } from '../environments/environment';

/** Tema visual PrimeNG (Lara light blue). */
const LaraLightBlue = definePreset(Lara, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: LaraLightBlue,
        options: { prefix: 'p', darkModeSelector: '.app-dark' },
      },
    }),
    provideAppInitializer(() => {
      const wl = inject(WhiteLabelService);
      if (environment.whiteLabel) {
        wl.apply(environment.whiteLabel);
      }
    }),
  ],
};
