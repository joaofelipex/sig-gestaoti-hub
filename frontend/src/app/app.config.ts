import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { WhiteLabelService } from './services/white-label.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // eventCoalescing atrasava o redesenho após await HTTP (modal só sumia no próximo clique)
    provideZoneChangeDetection({ eventCoalescing: false }),
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAppInitializer(() => {
      const wl = inject(WhiteLabelService);
      if (environment.whiteLabel) {
        wl.apply(environment.whiteLabel);
      }
    }),
  ],
};
