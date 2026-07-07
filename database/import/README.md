# Importar CSV (`*-export-*.csv`)

Os ficheiros de exportação usam **`;` como separador**. Coloca todos os `*-export-*.csv` numa pasta e corre o importador.

## Postgres já a correr (qualquer host/porta)

Passa a **URI** desse servidor. O script **apaga todas as linhas** do schema `public` e volta a inserir a partir dos CSV; no Auth recria utilizadores a partir dos `profiles` (modo `full` se existir `auth.identities`, senão `auth.users` minimal no Docker).

**Windows (cmd):**

```bat
set DATABASE_URL=postgresql://postgres:MINHASENHA@127.0.0.1:5432/sig_gestao_ti
set CSV_DIR=C:\Users\Infraestrutura-IMTS\Downloads
npm run db:import-csv
```

**WSL / Linux:**

```bash
export DATABASE_URL="postgresql://postgres:MINHASENHA@127.0.0.1:5432/sig_gestao_ti"
export CSV_DIR="/mnt/c/Users/Infraestrutura-IMTS/Downloads"
npm run db:import-csv
```

A base tem de ter o **mesmo modelo de tabelas** que o projeto (`database/init/01_schema.sql` e migrações em `database/migrations/`). Senão os `INSERT` falham.

Também podes usar: `POSTGRES_URL` em vez de `DATABASE_URL`.

## Postgres Docker (porta 5432, sem DATABASE_URL)

```bash
npm run db:up
CSV_DIR="..." npm run db:import-csv
```

Por defeito o script usa `TARGET=docker` (porta `HOST_PG_PORT`, default 5432).

## Ficheiros duplicados (`orcamentos-export-...` várias vezes)

O script escolhe o ficheiro **mais recente** por tabela (data de modificação).

## Tabelas vazias

Ficheiros só com cabeçalho são ignorados.
