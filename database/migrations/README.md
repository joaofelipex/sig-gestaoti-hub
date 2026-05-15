# Migrações SQL (incremental)

Ficheiros `*.sql` nesta pasta são aplicados ao Postgres local com:

```bash
npm run db:apply-migrations
```

- Ordem: **nome do ficheiro** (ordem lexicográfica).
- Ficheiros cujo nome contém **`baseline`** são ignorados por defeito (o schema base já vem de `../init/01_schema.sql` no Docker). Para aplicar também o baseline: `APPLY_BASELINE=true npm run db:apply-migrations`.
- Cada ficheiro corre **uma vez**; o registo fica em `public._repo_migration_log`.

Para **regenerar** o baseline de referência a partir do init:

```bash
npm run db:gen-baseline
```
