# Dados e base de dados — guia único

Tudo o que precisas para **PostgreSQL**, **API** e **dados** da aplicação num só sítio.

## Fluxo dos dados

```text
Angular (8080)  →  HTTP + JWT  →  API Express (3000)  →  PostgreSQL (5432)
```

A SPA **nunca** liga diretamente ao Postgres: só à API. A API valida o token e filtra por `org_id` do teu `profiles`.

## 1. Postgres (Docker)

| Campo | Valor local típico |
|-------|---------------------|
| Host | `127.0.0.1` |
| Porta | `5432` (`HOST_PG_PORT` no `scripts/db.sh`) |
| Utilizador | `postgres` |
| Palavra-passe | `postgres` |
| Base | `sig_gestao_ti` |

**Comandos (raiz do repo):**

| Comando | Efeito |
|---------|--------|
| `npm run db:up` | Sobe o contentor |
| `npm run db:down` | Para o contentor |
| `npm run db:reset` | Apaga o volume e recria (schema + seed de novo) |
| `npm run db:seed` | Reaplica `02_seed.sql` num volume já existente |
| `npm run db:sync-remote` | Copia dados do Postgres remoto (`REMOTE_DATABASE_URL` no `.env`) para o Docker local (ver `.env.example`) |

**Init SQL** (ordem): `database/init/01_schema.sql` → `02_seed.sql` → `03_api_auth.sql` (palavra-passe da conta demo).

## 2. API Express

| Campo | Valor local típico |
|-------|---------------------|
| URL da API (Angular) | `http://127.0.0.1:3000/api` |
| Health (sem JWT) | `GET http://127.0.0.1:3000/health` |

**Subir a API:** `cd backend && npm run dev` (porta **3000**).

**Variáveis** (`backend/.env`, ver `backend/.env.example`): `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `PORT`, `JWT_SECRET`, `CORS_ORIGIN`.

## 3. Angular

| Modo | Comando |
|------|---------|
| API + UI (após `npm run db:up`) | `npm run dev` na raiz |
| Só API | `cd backend && npm run dev` |
| Só UI (API já a correr) | `cd frontend && npm run dev` |

Conta demo (após seed): **dev@local.imts** / **demo123456**.

Verificação rápida Postgres + API: na raiz, `npm run doctor`.

## 4. Migrações SQL no Postgres local

Ficheiros em **`database/migrations/`** (incrementais, ex. políticas RLS e colunas novas) aplicam-se ao Docker:

```bash
npm run db:up
npm run db:apply-migrations
```

- Cria os papéis `authenticated`, `anon` e `service_role` se faltarem (exigido por `CREATE POLICY ... TO authenticated`).
- Por defeito **ignora** ficheiros cujo nome contém `baseline` (o schema base vem de `database/init/01_schema.sql`). Para forçar baseline: `APPLY_BASELINE=true npm run db:apply-migrations`.
- Cada ficheiro corre **uma vez** (tabela `public._repo_migration_log`).

## 5. Importar CSV

1. Exportar tabelas como `*-export-*.csv` (separador `;`).
2. Na raiz: `DATABASE_URL=...` `CSV_DIR=...` `npm run db:import-csv`  
   Detalhe: [database/import/README.md](../database/import/README.md).

## 6. Arquitetura e segurança

Modelo lógico, rotas da API e multi-tenant: [architecture.md](./architecture.md).
