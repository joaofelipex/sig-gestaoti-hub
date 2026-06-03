# Arquitetura — SIG Heartbeat Hub

Este documento descreve o **projeto atual do sistema** após a migração para a arquitetura 100% customizada (sem Supabase). 

## 1. Visão Geral e Contexto

O **SIG Heartbeat Hub** é um console de gestão de TI desenvolvido para a holding IMTS. O sistema centraliza a operação tecnológica: inventário de ativos, contratos, domínios (DNS), licenças, servidores, riscos, orçamentos e alertas.

A aplicação é fortemente **multi-tenant** com dois níveis de isolamento:
- **Organização (`org_id`)**: Isolamento primário (nível macro).
- **Empresa (`empresa_id`)**: Múltiplas empresas sob o guarda-chuva de uma mesma organização (nível micro).

## 2. Diagrama de Contexto (Three-Tier)

```mermaid
flowchart LR
  subgraph browser [Navegador]
    SPA[Angular 21 SPA]
  end
  subgraph api [Servidor (Node.js)]
    REST[API Express]
  end
  PG[(PostgreSQL 16)]
  
  SPA -->|HTTP + JWT| REST
  REST -->|node-postgres (pg)| PG
```

Diferente da versão inicial do projeto, o Frontend **NÃO** possui mais dependências diretas de bibliotecas de BaaS (Backend as a Service). Toda a comunicação é feita através do `HttpClient` do Angular direcionada à nossa API Node.js.

## 3. Stack Tecnológico Atualizado

| Camada | Tecnologia |
|--------|------------|
| **SPA (Frontend)** | Angular 21 (Standalone, lazy loading). |
| **Estilos / UI** | Tailwind CSS 4, `lucide-angular`, PrimeNG. |
| **Comunicação HTTP** | `@angular/common/http` encapsulado no `ApiService`. |
| **API (Backend)** | Node.js com Express 5. |
| **Driver BD** | `pg` (node-postgres) para conexão direta e execução de SQL puro. |
| **Segurança / Auth** | Autenticação baseada em JWT (`jsonwebtoken`) e senhas com Hash (`bcryptjs` / `pgcrypto`). |
| **Banco de Dados** | PostgreSQL 16 executado em um contêiner Docker local (`:5433`). |

## 4. Segurança e Autenticação Customizada

Como o Supabase Auth (GoTrue) foi removido, a autenticação agora segue o padrão clássico de JWT:

1. **Login/Signup:** O Angular envia `email` e `password` para `POST /api/auth/login`.
2. **Validação:** A API consulta a tabela `auth.users`, validando o hash da senha (gerado com `crypt()` via extensão `pgcrypto`).
3. **Token:** O Express gera um token JWT (via `jsonwebtoken` assinado com o `JWT_SECRET`) e o devolve ao frontend.
4. **Middlewares:** O Angular armazena no `localStorage` e envia o token no header `Authorization: Bearer <token>`. A API utiliza o middleware `requireAuth` para validar a assinatura, injetando o `userId` na requisição para extrair o `org_id` através da tabela `profiles`.

## 5. Estratégia de Multi-Tenancy e Escopo de Dados

O isolamento dos dados não é mais feito por RLS (Row Level Security) automática do banco, e sim pelas lógicas de rotas e repositórios da **API Express**.

- Ao consultar a rota genérica `GET /api/data/dashboard`, o servidor lê o `org_id` atrelado ao `userId` do JWT ativo.
- Ele apensa (através do helper `sqlOrgReadScope`) um fragmento SQL `AND org_id = $x` forçadamente em **todas** as queries.
- Para a inserção/atualização (`CrudService` no frontend → rotas genéricas na API), a API intercepta o `body` e sobreescreve/força o campo `org_id` para bater com o do usuário autenticado, impedindo vazamentos ou sequestro de IDs (Broken Object Level Authorization - BOLA).

## 6. Modelo Lógico de Dados (PostgreSQL)

O schema está em **`database/init/01_schema.sql`** e se divide nos seguintes blocos principais:

- **Autenticação:** schema `auth.users` (para referências, espelhando parcialmente o padrão clássico, mantendo `encrypted_password`).
- **Núcleo:** `organizations`, `empresas`, `departamentos`, `usuarios`, `profiles`, `user_roles`.
- **Operação de TI:** `ativos`, `dominios`, `dns_records`, `licencas`, `servidores`, `contratos`, `manutencoes`.
- **Gestão Financeira & Riscos:** `pagamentos`, `orcamentos`, `acoes_economista`, `riscos`, `registros_acesso`.

O controle de modificações ao longo do tempo é gerido pela tabela e scripts dentro de **`database/migrations/`**.

## 7. Fluxo de Desenvolvimento Diário

1. **Banco:** `npm run db:up` (sobe o docker Postgres na 5433).
2. **Ambiente Dev:** `npm run dev` na raiz inicia tanto a **API (3000)** quanto o **Frontend (8080)** simultaneamente.
3. **Acesso:** `http://localhost:8080` (O usuário seed demo é `dev@local.imts` / senha `demo123456`).

---
*Atualizado após a remoção estrutural de dependências do Supabase em favor do Express.*