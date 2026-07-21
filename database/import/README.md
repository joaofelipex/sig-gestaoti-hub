# Importar CSV (`*-export-*.csv`)

Separador: **`;`**. Colocar os ficheiros numa pasta e correr o importador.

O script **apaga todas as linhas** do schema `public` e reinsere a partir dos CSV. No auth, recria utilizadores a partir de `profiles` (modo `full` se existir `auth.identities`; senão `auth.users` minimal).

A base deve ter o mesmo modelo que o projeto (`database/init/01_schema.sql` + `database/migrations/`).

## Qualquer Postgres

```bash
export DATABASE_URL="postgresql://USER:SENHA@HOST:5432/sig_gestao_ti"
export CSV_DIR="/caminho/para/csv"
npm run db:import-csv
```

Também aceita `POSTGRES_URL` em vez de `DATABASE_URL`.

## Docker local (porta 5432)

```bash
npm run db:up
CSV_DIR="..." npm run db:import-csv
```

## Notas

- Vários ficheiros da mesma tabela: usa o **mais recente** (data de modificação).
- Ficheiros só com cabeçalho: ignorados.
- Em ambiente interno partilhado: fazer backup antes.

Ver [docs/dados-e-banco.md](../../docs/dados-e-banco.md).
