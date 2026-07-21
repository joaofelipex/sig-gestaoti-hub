# Migrações SQL

Aplicar ao Postgres (Docker local ou remoto com `DATABASE_URL`):

```bash
npm run db:apply-migrations
```

- Ordem: **nome do ficheiro** (lexicográfica).
- Inclui o ficheiro **baseline**.
- Cada `.sql` corre **uma vez** — registo em `public._repo_migration_log`.
- DDL tornada idempotente onde possível (`IF NOT EXISTS`, etc.).

Verificar tabelas:

```bash
npm run db:verify-schema
```

Regenerar baseline a partir de `database/init/01_schema.sql`:

```bash
npm run db:gen-baseline
```

Guia completo: [docs/dados-e-banco.md](../../docs/dados-e-banco.md).
