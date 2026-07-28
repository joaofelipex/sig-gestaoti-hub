# Dados e base de dados

Guia operacional: PostgreSQL, API, Angular, migrações e importação.

## Fluxo

```text
Angular (:8080)  →  JWT  →  API Express (:3000)  →  PostgreSQL
```

Com `DATA_SCOPE=org`, a API filtra sempre pelo `org_id` do utilizador autenticado.

---

## 1. PostgreSQL

### Local (Docker)

| Campo | Valor |
|-------|--------|
| Host | `127.0.0.1` |
| Porta | `5432` |
| User / password | `postgres` / `postgres` |
| Database | `sig_gestao_ti` |

```bash
npm run db:up      # sobe
npm run db:down    # para
npm run db:reset   # apaga volume + schema + seed
npm run db:seed    # só reaplicar seed demo
```

Na **primeira** criação do volume: `database/init/01_schema.sql` → `02_seed.sql` → `03_api_auth.sql`.

Sincronizar de um Postgres remoto para o Docker:

```bash
# .env na raiz com REMOTE_DATABASE_URL (ver .env.example)
npm run db:sync-remote
```

### Ambiente interno (Postgres partilhado)

Docker é opcional. Qualquer PostgreSQL 16 com o schema do projeto serve:

1. Schema + migrações (`DATABASE_URL=... npm run db:apply-migrations`).
2. `backend/.env` com a URI / `DB_*` desse servidor.
3. `JWT_SECRET` forte · `CORS_ORIGIN` com a origem da SPA · `DATA_SCOPE=org`.
4. Confirmar: `GET /api/health` e `GET /api/health/db`.

---

## 2. API

| Item | Local |
|------|--------|
| Base | `http://127.0.0.1:3000/api` |
| Health | `GET /health` |

```bash
cd backend && npm run dev
# ou na raiz: npm run dev
```

Variáveis (`backend/.env.example`):

| Variável | Função |
|----------|--------|
| `DATABASE_URL` / `DB_*` | Ligação ao Postgres |
| `PORT` | Predefinição `3000` |
| `JWT_SECRET` | Assinatura dos tokens |
| `CORS_ORIGIN` | Origens permitidas (lista separada por vírgulas) |
| `DATA_SCOPE` | `org` (interno) ou `all` (só debug) |

---

## 3. Angular

```bash
npm run dev                 # API + UI
cd frontend && npm run dev  # só UI
```

Proxy (`frontend/proxy.conf.json`): `/api` e `/health` → `127.0.0.1:3000`.

Demo: **dev@local.imts** / **demo123456**  
Check: `npm run doctor`

---

## 4. Migrações

Pasta: `database/migrations/`.

```bash
npm run db:apply-migrations
```

- Ordem lexicográfica do nome do ficheiro.
- Inclui o **baseline**; cada ficheiro corre **uma vez** (`public._repo_migration_log`).
- Em Postgres remoto: definir `DATABASE_URL` antes do comando.
- Verificar: `npm run db:verify-schema`
- Regenerar baseline: `npm run db:gen-baseline`

Ver [database/migrations/README.md](../database/migrations/README.md).

---

## 5. Import CSV em massa

Ficheiros `*-export-*.csv` (separador `;`).

```bash
DATABASE_URL="postgresql://..." CSV_DIR="/caminho/csv" npm run db:import-csv
```

**Atenção:** o script **apaga** o conteúdo do schema `public` e reinsere a partir dos CSV. Em base partilhada, só com backup e acordo da equipa.

Detalhe: [database/import/README.md](../database/import/README.md).

---

## 6. Relacionados

- Equipa: [uso-interno.md](./uso-interno.md)
- Arquitetura / API: [architecture.md](./architecture.md)
- Migração para a infra da empresa: [migracao.md](./migracao.md)
