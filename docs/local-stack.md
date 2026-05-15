# Stack 100% local (sem Supabase na nuvem)

O frontend usa `@supabase/supabase-js`, que fala com **API REST + Auth** compatíveis com Supabase. Isso pode correr **inteiramente no teu PC** com a [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started): Postgres, PostgREST, GoTrue (auth), Studio, etc., em Docker local — **não precisas de projeto hosted** para desenvolver.

## Requisitos

- Docker (ou Podman com compatibilidade)
- Node.js + `npx`
- Opcional: `npm install -g supabase` para não depender de `npx supabase` em cada comando

## Arranque

Na **raiz** do repositório:

```bash
npx supabase start
```

Na primeira execução a CLI descarrega imagens. Quando terminar:

- **API (o que o Angular usa):** `http://127.0.0.1:54321`
- **Studio (UI):** `http://127.0.0.1:54323`
- **Postgres (ligação direta):** porta **54322** (utilizador `postgres`; password em `npx supabase status`)

Reiniciar o esquema aplicando migrações em `supabase/migrations/`:

```bash
npx supabase db reset
```

Isto recria a base local, aplica migrações e corre **`supabase/seed.sql`** (dados de demonstração + conta **dev@local.imts** / **demo123456**).

### Ver tabelas e linhas no Postgres (mesma base que a app)

- **Supabase Studio (recomendado):** [http://127.0.0.1:54323](http://127.0.0.1:54323) → *Table Editor* → schema `public`.
- **Cliente SQL (DBeaver, Beekeeper, etc.):** `npx supabase status` mostra a **Database URL** (porta típica **54322**, user `postgres`, database `postgres`). É o **mesmo** Postgres onde o seed grava os dados que o Angular lê via API **54321**.

### Um comando: stack + dados

Na raiz do repositório (Docker a correr):

```bash
npm run local:stack
```

Equivale a `npx supabase start` seguido de `npx supabase db reset` (migrações + seed).

## Dados de demonstração (API local 54321)

O Angular já tem `environment.local.ts` com a URL e a chave **anon** padrão do ambiente local. Corre o dev server em modo **local**:

```bash
cd frontend && npm run dev:local
```

Isto usa `--configuration=local` (substitui `environment.ts` pelo ficheiro local).

Se `npx supabase status` mostrar uma **anon key** diferente da predefinida, atualiza `frontend/src/environments/environment.local.ts`.

## Schema completo (`database/init/01_schema.sql`)

O ficheiro `database/init/01_schema.sql` foi pensado para o Postgres do `scripts/db.sh` (porta **5433**) e inclui um `auth` mínimo que **não** deve ser aplicado tal qual no Postgres do Supabase local (o GoTrue já gere `auth`).

Para o dia a dia:

- Mantém o modelo em **`supabase/migrations/`** como fonte de verdade para o stack Supabase local, **ou**
- Usa o **SQL Editor** no Studio para criar/alterar tabelas em `public` e depois `npx supabase db diff` para gerar migrações.

O contentor `sig-heartbeat-hub-db` na porta 5433 é **opcional** (útil para DBeaver/psql puro); para a app Angular em modo local, usa só o stack da CLI (`supabase start`).

### Dados de demonstração no Postgres da 5433

O repositório inclui `database/init/02_seed.sql` (cópia sintética de dados IMTS para desenvolvimento). No **primeiro** arranque com volume novo, o Postgres do Docker executa `01_schema.sql` e em seguida o seed. Se já tinhas um volume criado **antes** do seed existir, na raiz do repo:

```bash
npm run db:seed
```

Isto aplica o mesmo SQL ao `sig_heartbeat_hub` em `localhost:5433` (ajusta `HOST_PG_PORT` se mudaste a porta). Esse contentor **não** é o que o Angular usa em `dev:local` (esse é o Postgres da CLI na **54322**, povoado por `supabase/seed.sql` após `db reset`).

## Parar

```bash
npx supabase stop
```

## Importação pontual de dados antigos na nuvem (opcional)

Se ainda tiveres um projeto Supabase hosted e quiseres **uma** cópia para o Postgres do `scripts/db.sh` (5433), usa `npm run db:sync-remote` e `.env` — isso **não** é necessário para trabalhar só em local.
