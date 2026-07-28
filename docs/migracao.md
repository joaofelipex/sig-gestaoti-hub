# Migração — SIG Gestão TI

Guia para levar o sistema do ambiente **local** (dev) para a **infraestrutura da empresa**.

Documentação relacionada: [dados-e-banco.md](./dados-e-banco.md) · [architecture.md](./architecture.md) · [uso-interno.md](./uso-interno.md)

---

## 1. O que se migra

| No repositório | Em produção |
|----------------|-------------|
| Código (`frontend/`, `backend/`) | Build + processo Node + ficheiros estáticos |
| Schema SQL (`database/init/`, `database/migrations/`) | PostgreSQL 16 na infra |
| Dump / CSV (fora do Git) | Dados reais restaurados no servidor |
| `backend/.env` (nunca no Git) | Segredos no servidor |

O Docker Compose do projeto sobe **apenas** o Postgres local. **Não** há Dockerfile da API nem da SPA — a empresa define o hospedeiro (Windows Server, Linux, container próprio, etc.).

```text
Utilizadores
     │  HTTPS
     ▼
Reverse proxy (IIS / nginx / Caddy / Traefik)
  ├── /           → SPA (frontend/dist/frontend/browser)
  └── /api        → API Node (127.0.0.1:3000)
                       │
                       ▼
                 PostgreSQL 16
```

A SPA usa `apiUrl: '/api'` (mesmo origem). O proxy **tem** de encaminhar `/api` para a API.

---

## 2. Pré-requisitos na empresa

Recolher com a equipa de infra:

| Pergunta | Porque importa |
|----------|----------------|
| Onde pode correr a app? (Windows / Linux / cloud) | Define serviço e proxy |
| Há PostgreSQL **16** (ou pode instalar)? | O schema assume PG 16+ |
| Quem gere DNS e certificado TLS? | URL pública/interna da SPA |
| Acesso só rede interna / VPN? | Firewall e exposição |
| Quem guarda segredos e backups? | `JWT_SECRET`, password DB, dumps |
| Processo de deploy (manual, CI)? | Quem publica builds |

### Runtime mínimo

- **Node.js** ≥ 20 (LTS 22+ recomendado) + npm
- **PostgreSQL 16** (serviço dedicado ou gerido)
- Reverse proxy com TLS
- Process manager para a API (systemd, NSSM, PM2, Serviço Windows, etc.)

Portas típicas:

| Serviço | Porta | Exposição |
|---------|-------|-----------|
| HTTPS (proxy) | 443 | Rede dos utilizadores |
| API Node | 3000 (localhost) | **Só** o proxy |
| PostgreSQL | 5432 | **Só** o host da API |

---

## 3. Checklist de migração

### A. Infra

- [ ] Servidor(es) com Node e acesso ao Postgres
- [ ] Base `sig_gestao_ti` criada (vazia)
- [ ] DNS (ex.: `sig-ti.empresa.local` ou hostname corporativo)
- [ ] Certificado TLS
- [ ] Firewall: 443 aberto; 3000 e 5432 fechados ao exterior
- [ ] Backup agendado do Postgres + teste de restore

### B. Configuração da API

Criar `backend/.env` **no servidor** (não versionar):

```env
DATABASE_URL=postgresql://USER:SENHA@HOST:5432/sig_gestao_ti
DB_HOST=HOST
DB_PORT=5432
DB_USERNAME=USER
DB_PASSWORD=SENHA
DB_DATABASE=sig_gestao_ti

PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://SEU-HOST-DA-APP
JWT_SECRET=GERAR-SEGREDO-LONGO-E-ALEATORIO
DATA_SCOPE=org
```

| Variável | Produção |
|----------|----------|
| `NODE_ENV` | `production` (a API **recusa** o `JWT_SECRET` padrão) |
| `JWT_SECRET` | Segredo forte e único (não reutilizar o de desenvolvimento) |
| `CORS_ORIGIN` | Origem(ões) exactas da SPA, separadas por vírgula |
| `DATA_SCOPE` | **`org`** — obrigatório em ambiente partilhado |
| `DATABASE_URL` / `DB_*` | Credenciais do Postgres da empresa |

Modelo: `backend/.env.example`.

### C. Schema e dados

1. Aplicar schema / migrações no Postgres de destino:

```bash
# Na máquina com acesso ao Postgres de produção (ou jump host)
set DATABASE_URL=postgresql://USER:SENHA@HOST:5432/sig_gestao_ti
npm run db:apply-migrations
npm run db:verify-schema
```

   Alternativa em base nova: aplicar `database/init/01_schema.sql`, `02_seed.sql` (opcional), `03_api_auth.sql` e depois as migrações pendentes.

2. Carregar dados (escolher **um** caminho):

| Método | Quando usar | Cuidado |
|--------|-------------|--------|
| `pg_restore` / `psql -f dump.sql` | Dump completo (ex. `database/sig_gestao_ti_dump_*.sql`) | Dumps com dados **não** vão para o Git |
| `npm run db:import-csv` | Carga a partir de CSV exportados | **Apaga** o conteúdo de `public` — backup antes |
| Só seed + admin manual | Arranque limpo | Criar org e utilizadores em Configurações |

3. Remover ou desactivar a conta demo (`dev@local.imts`) se existir.
4. Admin da holding cria utilizadores em **Configurações** — evitar que cada pessoa use “Criar conta” (cria **nova** organização).

### D. Build e publicação

Na máquina de build (ou no servidor):

```bash
# Dependências
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# API
cd backend
npm run build
# Arranque em produção (após .env configurado):
npm run start:prod
# Ou: node -r dotenv/config dist/index.js   (com NODE_ENV=production)

# SPA
cd ../frontend
npm run build
# Artefacto: frontend/dist/frontend/browser/
```

Na raiz, `npm run build` também gera o frontend.

Publicar a pasta `frontend/dist/frontend/browser/` no site do reverse proxy.

### E. Reverse proxy

Requisitos:

1. Servir ficheiros estáticos da SPA.
2. Encaminhar `/api` (e, se útil, `/health`) para `http://127.0.0.1:3000`.
3. Fallback SPA: rotas Angular → `index.html`.

#### Exemplo nginx

```nginx
server {
  listen 443 ssl;
  server_name sig-ti.empresa.local;

  # ssl_certificate ...;
  # ssl_certificate_key ...;

  root /var/www/sig-gestao-ti/browser;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /health {
    proxy_pass http://127.0.0.1:3000/health;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

#### Exemplo IIS (resumo)

- Site com path físico = pasta `browser` do build Angular.
- URL Rewrite: regras SPA (`index.html`) + reverse proxy ARR para `/api` → `http://127.0.0.1:3000`.
- Binding HTTPS com certificado corporativo.

Se a API e a SPA ficarem em **hosts diferentes**, é preciso alterar `environment` do frontend (`apiUrl` absoluto) e rebuild — o default assume mesmo domínio.

### F. Validação (smoke test)

- [ ] `GET https://SEU-HOST/health` ou `http://127.0.0.1:3000/health` → OK
- [ ] `GET …/api/health` e `…/api/health/db` → OK
- [ ] Login com utilizador real
- [ ] Dashboard com dados da org correcta
- [ ] Confirmar que um utilizador **não** vê dados de outra org (`DATA_SCOPE=org`)
- [ ] Admin consegue criar utilizador em Configurações

---

## 4. Segurança (produção)

- [ ] `DATA_SCOPE=org`
- [ ] `JWT_SECRET` forte; `NODE_ENV=production`
- [ ] `CORS_ORIGIN` só com a(s) URL(s) da app
- [ ] Postgres sem acesso público; password forte
- [ ] Conta demo removida; política clara sobre signup
- [ ] TLS no proxy; API só em localhost (ou rede privada)
- [ ] Backup + retenção documentados (RPO/RTO)
- [ ] Quem pode correr `db:import-csv` / `db:reset` (comandos destrutivos)

A API limita tentativas de login/signup em memória (por processo). Adequado a uso interno pequeno; com várias instâncias da API, o limite não é partilhado.

---

## 5. Migração de dados a partir do ambiente local

### Dump SQL (recomendado para cópia completa)

No PC de desenvolvimento (com `pg_dump` instalado), apontando ao Postgres local do DBeaver:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  --dbname="postgresql://USER:SENHA@127.0.0.1:5432/sig_gestao_ti" `
  --format=plain --no-owner --no-acl --encoding=UTF8 `
  --file="database\sig_gestao_ti_dump_AAAAMMDD.sql"
```

Os ficheiros `database/*_dump_*.sql` estão no `.gitignore`.

No servidor de destino (base vazia ou após drop controlado):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h HOST -U USER -d sig_gestao_ti `
  -f "sig_gestao_ti_dump_AAAAMMDD.sql"
```

### CSV em massa

Ver [database/import/README.md](../database/import/README.md). **Sempre** backup antes — o import limpa `public`.

### Sync remoto → local (dev)

`npm run db:sync-remote` copia de um Postgres remoto para o Docker local (`REMOTE_DATABASE_URL` na raiz). É ferramenta de **desenvolvimento**, não o fluxo habitual de ir para produção.

---

## 6. Operação contínua

| Tarefa | Como |
|--------|------|
| Nova versão da app | Build front + API; reiniciar processo Node; publicar `browser/` |
| Alteração de schema | Novo ficheiro em `database/migrations/` → `npm run db:apply-migrations` no destino |
| Health | Monitorizar `/health` e `/api/health/db` |
| Utilizadores | Admin em Configurações (`docs/uso-interno.md`) |

Comandos úteis já no repo: `npm run doctor` (ambiente local), `npm run db:verify-schema`, `npm run check:data`.

---

## 7. O que este repo ainda não inclui

Para planear com a infra:

- Dockerfile / Compose da **API** e da **SPA**
- Pipelines CI/CD (GitHub Actions, Azure DevOps, etc.)
- Unidades systemd / scripts NSSM prontos
- Config IIS/nginx versionada para o vosso domínio

Este documento descreve o contrato técnico; a implementação concreta depende do padrão da empresa.

---

## 8. Ordem sugerida (resumo)

1. Mapear infra (secção 2).  
2. Provisionar Postgres + schema.  
3. Configurar `backend/.env` de produção.  
4. Restaurar dados (dump ou CSV) + criar admins.  
5. Build API + SPA; proxy + TLS.  
6. Smoke test (secção 3F).  
7. Backup e handoff à operação.
