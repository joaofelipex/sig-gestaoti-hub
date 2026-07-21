# Uso interno — SIG Gestão TI

Guia da equipa IMTS. O produto está **pronto para uso interno**: uma organização (tenant), várias empresas, papéis por utilizador.

## Objetivo

Centralizar a operação de TI da holding: saber o que existe, quando renova, o que custa e quem é responsável — sem folhas de cálculo dispersas.

## Como entrar

1. Abrir a URL da aplicação (local: [http://localhost:8080](http://localhost:8080)).
2. Autenticar com o email/palavra-passe dados pelo **admin** da organização.
3. Demo local (após `npm run db:seed`): **dev@local.imts** / **demo123456**.

**Importante no uso interno:** o registo público (“Criar conta”) cria uma *nova* organização. Para a holding, o admin deve criar contas em **Configurações**, não cada pessoa registar-se sozinha.

## Papéis

| Papel | Permissões |
|-------|------------|
| **Admin** | Edita tudo, importa CSV, gere utilizadores e papéis |
| **Gestor** | Edita dados operacionais; não gere utilizadores |
| **Utilizador** | Só consulta (sem Novo / Importar) |

Sem papel na base → tratado como **Utilizador**.

## Menu

### Visão

- **Painel** — KPIs e resumo operacional.
- **Economista** — orçamentos, ações de poupança, contratos e gasto.

### Organização

- **Empresas** — empresas da holding ligadas à organização atual.

### Ativos & infra

- **Ativos (ITAM)** — equipamentos e ativos.
- **Domínios & DNS** — registos de domínio; vencimento do domínio e do SSL.
- **Licenças (SAM)** — software e renovações.
- **Servidores** — infraestrutura; SSL e fim de contrato.

### Operações

- **Manutenção** — tickets e histórico.
- **Movimentações** — movimentos de ativos.
- **Estoque** — stock / inventário.

### Controle

- **Governança** — acessos e riscos.
- **Pagamentos** — contas a pagar.
- **Alertas** — caixa de avisos.

### Conta

- **Configurações** (menu do utilizador) — perfil, palavra-passe; admin gere a equipa.

## Barra de dados (listas)

Na maioria das páginas:

| Ação | Quem | Notas |
|------|------|--------|
| Pesquisar / filtrar | Todos | Filtra a tabela atual |
| Exportar CSV | Todos | Extrai a vista filtrada |
| Importar CSV / Novo | Admin e gestor | Escrita |
| **Calendário** | Todos (páginas com o botão) | Ficheiro `.ics` |

### Calendário (`.ics`)

Disponível em **Domínios & DNS**, **Licenças** e **Servidores**. Gera eventos de dia inteiro para importar no Outlook, Google Calendar, etc.

| Página | Eventos incluídos |
|--------|-------------------|
| Domínios | Vencimento do domínio + vencimento SSL |
| Licenças | Data de renovação |
| Servidores | Vencimento SSL + fim de contrato |

Se não houver datas válidas, a app avisa e **não** descarrega ficheiro vazio.

## Boas práticas

1. Uma organização para a holding (salvo acordo em contrário); empresas distintas em **Empresas**.
2. Só admins criam/alteram contas; não partilhar a conta demo fora do ambiente local.
3. Manter datas de vencimento/renovação preenchidas — alimentam alertas e o calendário.
4. Em ambiente partilhado: API com `DATA_SCOPE=org`, `JWT_SECRET` forte e `CORS_ORIGIN` limitado aos hosts da app.

## Problemas frequentes

| Sintoma | O que verificar |
|---------|-----------------|
| Login falha / sessão estranha | API a correr; `JWT_SECRET` não mudou a meio; limpar storage e voltar a entrar |
| Tabelas vazias | Dados da tua org; health em `/api/health/db` |
| Sem Novo / Importar | Papel **Utilizador** |
| UI sem estilos | `npm install` em `frontend/` no mesmo ambiente do `ng serve` |

---

Operação técnica (BD, API, migrações): [dados-e-banco.md](./dados-e-banco.md)  
Arquitetura: [architecture.md](./architecture.md)
