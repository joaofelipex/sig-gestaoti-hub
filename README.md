# SIG Heartbeat Hub

Console de gestão de TI para a holding IMTS: ativos (ITAM), domínios, licenças, servidores, manutenção, estoque, pagamentos, governança, alertas e visão econômica. O produto é **multi-organização** (`org_id`) e **multi-empresa** dentro da org (`empresa_id`), com dados em **PostgreSQL** expostos via **Supabase** (API + Auth + RLS).

## Documentação

| Documento | Conteúdo |
|-----------|------------|
| [docs/architecture.md](docs/architecture.md) | Projeto do sistema: stack, camadas, dados, segurança, rotas e convenções. |
| [.lovable/plan.md](.lovable/plan.md) | Roadmap de evolução do frontend (não substitui a arquitetura). |

## Estrutura do repositório

| Pasta | Descrição |
|-------|-----------|
| `frontend/` | Aplicação **Angular 21** (standalone), Tailwind 4, cliente Supabase. |
| `database/init/` | Schema SQL para **Postgres local** (espelho lógico do modelo; funções como `current_org_id()` podem ser stubs). |
| `supabase/migrations/` | Migrações aplicáveis ao **Supabase** (RLS, colunas, índices). |
| `backend/` | API **Express** + TypeORM (esqueleto; não é o caminho principal de dados hoje). |
| `scripts/` | `db.sh` — Postgres em contêiner (Docker/Podman) na porta padrão **5433**. |

## Início rápido

### Frontend (recomendado)

Na raiz do repo (Linux/WSL):

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080` (ver `package.json` na raiz).

Configure o Supabase em `frontend/src/environments/environment.ts` (URL e chave anon). Em produção, use arquivos de environment do Angular com valores injetados no build.

### Base de dados local (opcional)

```bash
npm run db:up      # sobe Postgres + aplica 01_schema.sql
npm run db:down
npm run db:reset
```

## Stack resumida

- **UI:** Angular, Tailwind CSS, Lucide (ícones).
- **Dados:** Supabase JS → PostgREST + Row Level Security.
- **Auth:** Supabase Auth; perfis em `profiles` com `org_id`.
- **Estado:** `DashboardService` + `EmpresaService` (empresa selecionada em `localStorage`).

Para detalhes, fluxos e lista de tabelas, vê [docs/architecture.md](docs/architecture.md).
