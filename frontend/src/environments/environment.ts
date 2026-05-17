import { LARA_LIGHT_BLUE, type WhiteLabelConfig } from '../app/core/white-label.model';

/**
 * Ambiente base (ex.: `ng serve` sem `--configuration=local`).
 * Desenvolvimento alinhado à stack: use `npm run dev:ui` na raiz (usa `environment.stack.ts` via config `local`).
 */
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:3000/api',
  showLocalDemoHint: false,
  stack: 'default',
  whiteLabel: {
    ...LARA_LIGHT_BLUE,
    logoUrl: null,
    logoMiniUrl: null,
  } satisfies WhiteLabelConfig,
};
