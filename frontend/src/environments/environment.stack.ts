/**
 * Gerado por `npm run sync:stack` a partir de config/stack.env.example (+ config/stack.env se existir).
 * Não editar à mão: altere a stack e volte a correr sync.
 */
import { SIG_DEFAULT_WHITELABEL, type WhiteLabelConfig } from '../app/core/white-label.model';

export const environment = {
  production: false,
  apiUrl: "/api",
  showLocalDemoHint: true,
  stack: "local",
  whiteLabel: {
    ...SIG_DEFAULT_WHITELABEL,
  } satisfies WhiteLabelConfig,
};
