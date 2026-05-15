/**
 * Ambiente por defeito (CI / build genérico).
 * Desenvolvimento local com Postgres + API: `npm run dev:local` (usa `environment.local.ts`).
 */
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:3000/api',
  /** Mostrar credenciais demo na página de login. */
  showLocalDemoHint: false,
};
