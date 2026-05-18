import { SIG_DEFAULT_WHITELABEL, type WhiteLabelConfig } from '../app/core/white-label.model';

export const environment = {
  production: false,
  apiUrl: '/api',
  whiteLabel: {
    ...SIG_DEFAULT_WHITELABEL,
  } satisfies WhiteLabelConfig,
};
