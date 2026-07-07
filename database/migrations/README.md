# Migrações SQL (incremental)

Ficheiros `*.sql` nesta pasta são aplicados ao Postgres local com:

```bash
npm run db:apply-migrations
```

- Ordem: **nome do ficheiro** (ordem lexicográfica).
- **Todos** os ficheiros `.sql` são aplicados (inclui `baseline`).
- Cada ficheiro corre **uma vez**; o registo fica em `public._repo_migration_log`.
- O script torna o DDL idempotente (`IF NOT EXISTS`, etc.) para poder correr em bases já parcialmente criadas.

Verificar tabelas:

```bash
npm run db:verify-schema
```

Para **regenerar** o baseline de referência a partir do init:

```bash
npm run db:gen-baseline
```
