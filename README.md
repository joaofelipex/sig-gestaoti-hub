# SIG Heartbeat Hub

Console de gestão de TI para a holding IMTS (ativos, domínios, licenças, servidores, manutenção, inventário, pagamentos, governança, alertas, visão económica). O produto é **multi-organização** (`org_id`) e **multi-empresa** (`empresa_id`).

## Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Angular 21, Tailwind 4, `HttpClient` → API REST |
| **API** | Node + Express + `pg` (JWT + bcrypt nas contas) |
| **Base de dados** | PostgreSQL 16 (Docker local na porta **5433** por defeito) |

Não é necessário PostgREST nem serviço GoTrue externos: a app fala só com a **API** que por sua vez acede ao **PostgreSQL**.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| **[docs/dados-e-banco.md](docs/dados-e-banco.md)** | **Guia único:** Postgres, API, Angular, import CSV, comandos. |
| [docs/architecture.md](docs/architecture.md) | Visão do sistema, rotas da API, segurança. |

## Início rápido (local)

Resumo: ver **[docs/dados-e-banco.md](docs/dados-e-banco.md)**. Na app (com sessão), abre **Dados & base** no menu lateral para ver ligações, estado e contagens.

1. **Docker** a correr.
2. Na **raiz** do repositório:

```bash
npm install
npm run db:up
```

Na primeira subida do volume, o Postgres aplica `database/init/01_schema.sql`, `02_seed.sql` e `03_api_auth.sql` (hash da conta demo).

3. **API + Angular** (duas opções):

**Uma só janela** (recomendado após `db:up`):

```bash
npm run dev:stack
```

Isto sobe a API na porta **3000** e o `ng serve` na **8080** com `environment.local.ts` (URL da API `http://127.0.0.1:3000/api`).

**Ou em terminais separados:** `npm run api:dev` e, à parte, `npm run dev:ui` (ou `cd frontend && npm run dev:local`).

4. Confirma ligações: `npm run check:stack` (Postgres 5433 + `GET /health` na API).

Abre [http://localhost:8080](http://localhost:8080) → **Entrar** com **dev@local.imts** / **demo123456**.

### Variáveis da API (`backend/.env`)

Opcional: ficheiro `backend/.env` (ver `backend/.env.example`). Por defeito a API liga a `127.0.0.1:5433`.

### Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run check:stack` | Verifica Postgres (5433) e `GET /health` da API (3000) |
| `npm run dev:stack` | API (3000) + Angular (8080, config `local`) em paralelo |
| `npm run dev` / `npm run dev:ui` | Só Angular com `environment.local.ts` |
| `npm run db:up` / `db:down` / `db:reset` | Postgres Docker |
| `npm run api:dev` | API Express em modo desenvolvimento |
| `npm run db:seed` | Reaplicar dados demo no Docker (volume já existente) |
| `npm run db:apply-migrations` | Aplica `database/migrations/*.sql` ao Postgres local (papéis RLS + registo em `_repo_migration_log`) |
| `npm run db:gen-baseline` | Regenera `database/migrations/20260101000000_baseline_public_schema.sql` a partir de `database/init/01_schema.sql` |

Migrações SQL estão em **`database/migrations/`** (aplicar com `npm run db:apply-migrations`).

## Estrutura do repositório

| Pasta | Descrição |
|-------|-----------|
| `frontend/` | Angular |
| `backend/` | API Express + `pg` |
| `database/init/` | Schema + seed + auth (`01`–`03`) para o Postgres Docker |
| `database/migrations/` | SQL incremental (RLS, colunas novas). Aplicar com `npm run db:apply-migrations` |
| `scripts/` | `db.sh`, import CSV, `apply-repo-migrations`, etc. |
