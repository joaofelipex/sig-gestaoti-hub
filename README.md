# SIG Gestão TI

**Estado:** pronto para **uso interno** na holding IMTS.

Console web de gestão de TI: inventário de ativos, domínios, licenças, servidores, manutenção, estoque, pagamentos, governança, alertas e visão económica. Multi-organização (`org_id`) e multi-empresa (`empresa_id`), com autenticação JWT e isolamento de dados na API.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Angular 21 · Tailwind 4 · PrimeNG |
| API | Node.js · Express · `pg` · JWT |
| Base de dados | PostgreSQL 16 |

```text
Navegador (Angular)  →  API Express + JWT  →  PostgreSQL
```

## Documentação

| Documento | Para quem | Conteúdo |
|-----------|-----------|----------|
| **[docs/uso-interno.md](docs/uso-interno.md)** | Equipa IMTS | Acesso, papéis, módulos, CSV e calendário |
| **[docs/dados-e-banco.md](docs/dados-e-banco.md)** | Quem sobe o ambiente | Postgres, API, migrações, CSV em massa, variáveis |
| [docs/architecture.md](docs/architecture.md) | Desenvolvimento | Arquitetura, RBAC, rotas da API, multi-tenant |

## Módulos (menu)

| Grupo | Páginas |
|-------|---------|
| Visão | Painel (`/dashboard`), Economista (`/economista`) |
| Organização | Empresas (`/empresas`) |
| Ativos & infra | Ativos, Domínios & DNS, Licenças, Servidores |
| Operações | Manutenção, Movimentações, Estoque |
| Controle | Governança, Pagamentos, Alertas |
| Conta | Configurações (`/configuracoes`) — perfil e, para admin, utilizadores |

Nas listas: pesquisa, filtros, import/export CSV. Em **Domínios**, **Licenças** e **Servidores**: exportação **Calendário** (`.ics`) para Outlook / Google Calendar.

## Papéis

| Papel | Dados | Utilizadores da org |
|-------|--------|---------------------|
| `admin` | leitura e escrita | sim |
| `gestor` | leitura e escrita | não |
| `usuario` | só leitura | não |

## Arranque local

Pré-requisito: Docker.

```bash
npm install
npm run db:up
npm run dev
```

| Serviço | URL |
|---------|-----|
| App | http://localhost:8080 |
| API | http://127.0.0.1:3000 |
| Health | http://127.0.0.1:3000/health |

Conta demo (seed): **dev@local.imts** / **demo123456**

Verificação: `npm run doctor`.

Configuração da API: `backend/.env` (modelo em `backend/.env.example`). Em ambiente interno partilhado: `JWT_SECRET` forte, `CORS_ORIGIN` correto, `DATA_SCOPE=org`.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + Angular |
| `npm run doctor` | Postgres + health da API |
| `npm run db:up` / `db:down` / `db:reset` | Postgres Docker |
| `npm run db:seed` | Dados demo no Docker |
| `npm run db:apply-migrations` | SQL em `database/migrations/` |
| `npm run db:import-csv` | Import CSV (`DATABASE_URL` + `CSV_DIR`) |
| `npm run db:sync-remote` | Remoto → Docker local |
| `npm run build` | Build do frontend |

## Repositório

| Pasta | Conteúdo |
|-------|----------|
| `frontend/` | SPA Angular |
| `backend/` | API Express |
| `database/init/` | Schema + seed + auth (Docker) |
| `database/migrations/` | SQL incremental |
| `docs/` | Documentação |
| `scripts/` | Docker, doctor, import, migrações |
