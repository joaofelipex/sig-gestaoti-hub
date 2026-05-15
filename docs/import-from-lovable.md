# Trazer dados do Lovable (Supabase) para o teu PostgreSQL local

No Lovable, a app costuma estar ligada a um **projeto Supabase** (Postgres na nuvem). As “tabelas com dados” que vês no Lovable estão nesse Postgres remoto. Para as ter **no teu PC**, tens de **copiar** desse servidor para um Postgres local.

Há dois destinos úteis neste repositório:

| Destino | O que é | Quando usar |
|--------|---------|----------------|
| **Supabase local** (`supabase start`, porta **54322**) | Mesma base que o **Studio** (54323) e a **API** (54321) que o Angular usa em `dev:local`. | Queres ver os dados **no sistema** e no Studio. |
| **Postgres Docker** (`npm run db:up`, porta **5433**) | Postgres simples com `database/init/01_schema.sql`. | Exploras com DBeaver/psql **sem** stack Supabase; a app em `dev:local` **não** usa esta porta por defeito. |

---

## Importar CSV exportados (Table Editor do Supabase / Lovable)

Se exportaste tabelas para ficheiros `*-export-*.csv` (separador **`;`**, como o Supabase usa por defeito em PT), podes carregá-los diretamente para o Postgres local **sem** connection string remota.

1. Instala dependências na raiz: `npm install`
2. Garante que a base tem o schema do projeto (tabelas `public` + `auth`): por exemplo `npm run local:stack` (Supabase local) ou `npm run db:reset` (Docker 5433 com `01_schema.sql`).
3. Importa os CSV para **o Postgres que quiseres**:
   - **Com URI explícita** (o teu servidor já a correr):

```bash
DATABASE_URL="postgresql://postgres:SENHA@127.0.0.1:5432/sig_heartbeat_hub" CSV_DIR="C:/Users/Infraestrutura-IMTS/Downloads" npm run db:import-csv
```

   - **Supabase local** (sem `DATABASE_URL`, com `supabase start`):

```bash
npm run supabase:start
CSV_DIR="C:/Users/Infraestrutura-IMTS/Downloads" npm run db:import-csv
```

   - Ou copia os `.csv` para `database/import/csv/` e corre `npm run db:import-csv` (com `DATABASE_URL` no ambiente se não for Supabase CLI).

O script **limpa** o schema `public` e recria utilizadores no **Auth** a partir de `profiles` / `user_roles`. Palavra-passe (modo Supabase Auth): **`imported123`**.

Detalhes: [database/import/README.md](../database/import/README.md).

---

## 1. Obter a connection string do projeto (Lovable → Supabase)

1. Abre o projeto no **Lovable** e localiza a ligação ao **Supabase** (muitas vezes “Integrations”, “Backend”, “Database” ou link para o dashboard Supabase).
2. No **Supabase Dashboard** do projeto: **Project Settings → Database**.
3. Em **Connection string**, escolhe **URI** e modo **direct** (porta **5432**), com SSL:
   - Deve incluir `?sslmode=require` (ou equivalente).

Exemplo (valores fictícios):

```text
postgresql://postgres.[ref]:[SUA_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

4. Na **raiz** do repositório, cria ou edita o ficheiro `.env` (não commits este ficheiro):

```bash
REMOTE_DATABASE_URL="postgresql://...sua-uri-completa..."
```

---

## 2. Copiar para o Supabase local (recomendado para ver na app)

1. Garante que o schema local está alinhado com o remoto (migrações do repo):

   ```bash
   npm run local:stack
   ```

   (Isto recria a base local com migrações + seed de demo; o passo seguinte **substitui** os dados em `public` pelos do remoto.)

2. Copia **só os dados** do schema `public` do remoto para o Postgres do Supabase local:

   ```bash
   npm run db:sync-remote:supabase
   ```

   O script (`scripts/sync-remote-to-supabase-local.sh`):

   - Lê `REMOTE_DATABASE_URL` do `.env`
   - Descobre o Postgres local com `npx supabase status -o env` (`DB_URL`)
   - Faz `TRUNCATE ... CASCADE` em **todas** as tabelas em `public` (limpa dados mantendo estrutura)
   - `pg_dump` (remoto) + `pg_restore` (local) com `--data-only` e `--disable-triggers`

3. Confirma no **Studio**: [http://127.0.0.1:54323](http://127.0.0.1:54323) → Table Editor.

4. Corre o frontend em modo local e entra (se usares contas do remoto, o **Auth local** pode não coincidir com o da nuvem — vê secção Auth abaixo).

   ```bash
   cd frontend && npm run dev:local
   ```

### Auth (`auth.users`) e perfis

Este fluxo copia **`public`** (ex.: `profiles`, `empresas`, `ativos`). **Não** copia o schema `auth` do Supabase remoto (é diferente do GoTrue local e costuma partir migrações).

- Se `profiles.user_id` referenciar utilizadores que **não** existem no Auth local, podes ter erros de FK ou sessões que não batem com os `user_id` das linhas.
- Soluções práticas: criar os mesmos emails no Auth local (signup) e ajustar `profiles` no Studio, **ou** importar só tabelas sem FK para `auth.users`, **ou** usar utilizador de serviço / políticas temporárias (avançado).

Se o `pg_restore` falhar, copia a mensagem de erro — muitas vezes é coluna em falta (schema diferente) ou FK.

---

## 3. Copiar para o Postgres Docker (porta 5433)

Útil se só queres um dump consultável no contentor `db.sh`, sem Supabase local.

```bash
npm run db:up
npm run db:reset
npm run db:sync-remote
```

Variável: a mesma `REMOTE_DATABASE_URL` no `.env`.  
Detalhes extra: `FULL_PUBLIC_SCHEMA=1 npm run db:sync-remote` (ver comentários em `scripts/sync-supabase-to-local.sh`).

---

## 4. Export manual (poucos dados)

No Supabase (nuvem): **Table Editor → Export CSV** por tabela, depois **import** no Studio local ou `INSERT` via SQL. Funciona bem para poucas tabelas.

---

## Resumo

- **Não existe** no Git uma “cópia binária” automática do banco do Lovable: tens de ligar ao **Postgres remoto** com a URI e correr um **dump/restore** ou export manual.
- Para **ver no sistema** com o stack actual: usa **`npm run db:sync-remote:supabase`** depois de `REMOTE_DATABASE_URL` no `.env` e `supabase start` + `supabase db reset` (ou equivalente).
