/**
 * Postgres Docker (5433) + API Express (3000) na tua máquina.
 * Arranca: `npm run db:up` na raiz, `npm run api:dev`, depois `npm run dev:local` aqui.
 */
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:3000/api',
  showLocalDemoHint: true,
};
