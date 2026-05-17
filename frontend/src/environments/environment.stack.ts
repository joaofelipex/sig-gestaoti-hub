/**
 * Gerado por `npm run sync:stack` a partir de config/stack.env.example (+ config/stack.env se existir).
 * whiteLabel: cores fixas Lara Light Blue (design).
 */
import { LARA_LIGHT_BLUE } from '../app/core/white-label.model';

export const environment = {
  production: false,
  apiUrl: '/api',
  showLocalDemoHint: true,
  stack: 'local',
  whiteLabel: {
    ...LARA_LIGHT_BLUE,
    logoUrl: null,
    logoMiniUrl: null,
  },
};
