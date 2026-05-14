## Varredura completa do sistema IMTS

Vou aplicar, em sequência, melhorias funcionais em todos os módulos do frontend Angular (`frontend/src/app`). Tudo será feito sobre o `DashboardService` + Supabase já existente, respeitando RLS por `org_id`.

### 1. Componentes reutilizáveis (base da varredura)
Criar em `frontend/src/app/components/`:
- `data-toolbar.component.ts` — barra com busca (input), filtros (selects dinâmicos), botões "Novo", "Importar CSV", "Exportar CSV".
- `confirm-dialog.component.ts` — confirmação de exclusão.
- `entity-modal.component.ts` — modal genérico para formulários (cabeçalho + slot + footer Salvar/Cancelar).
- `csv.util.ts` — funções `exportToCSV(rows, filename)` e `parseCSV(file)`.
- `kpi-card.component.ts` — card de KPI com ícone, valor, variação e cor semântica.
- `chart-bar.component.ts`, `chart-donut.component.ts`, `chart-line.component.ts` — gráficos SVG nativos (sem nova dependência), com tooltip e legendas.

### 2. CRUD completo em todos os módulos
Adicionar formulários (criar/editar) e exclusão com confirmação em:
- Ativos (ITAM), Domínios, DNS records, Licenças, Servidores, Manutenção, Movimentações, Estoque, Pagamentos, Governança (acessos + riscos), Orçamentos.

Cada página terá:
- Botão "Novo" → abre `entity-modal` com campos do schema.
- Botão "Editar" por linha.
- Botão "Excluir" por linha → `confirm-dialog`.
- Toast de sucesso/erro.

Cada operação chamará `supabase.from('<tabela>').insert/update/delete` com `org_id = current_org_id()`.

### 3. Busca, filtros e CSV em todas as listagens
Substituir o cabeçalho atual de cada página pelo `data-toolbar`:
- Busca textual em todos os campos visíveis (client-side).
- Filtros específicos: status, categoria, fornecedor, departamento, vencimento (próx. 30/60/90 dias).
- Exportar CSV da lista filtrada.
- Importar CSV: parse → preview → bulk insert.

### 4. Alertas centralizados
- Página `/alertas` reescrita com agrupamento por severidade e tipo, marcar como lida/excluir.
- Função SQL `gerar_alertas_vencimento()` (migration) que insere em `alertas` os registros de:
  - Domínios vencendo em <30/<15 dias e SSL <30/<15.
  - Licenças com `data_renovacao` <30 dias.
  - Servidores com `ssl_vencimento` ou `contrato_fim` <30 dias.
  - Manutenções abertas há >30 dias.
- Badge no menu lateral com contagem de alertas não lidas (assinatura realtime na tabela `alertas`).

### 5. Dashboards com gráficos melhores
- **Dashboard principal**: 6 KPIs (Ativos, Custo mensal TI, Licenças em uso, Domínios a vencer, Uptime médio, Alertas críticos), gráfico de barras de custo por categoria, donut de status dos ativos, linha de evolução de gastos 12 meses (a partir de `pagamentos`).
- **Visão Economista**: manter layout atual mas trocar SVG por componentes `chart-*`, adicionar gráfico de TCO por categoria e fluxo de caixa OPEX vs CAPEX (a partir de `contratos` + `pagamentos`).
- **Governança**: adicionar IT Health Score (0–100) e gráfico de distribuição de severidade dos riscos.

### Detalhes técnicos
- Stack mantida: Angular 18 standalone + Tailwind + Supabase JS no `SupabaseService`.
- Estado global continua via `DashboardService` (BehaviorSubject) — adicionar métodos `create/update/delete` por entidade que dão refresh otimista.
- Gráficos em SVG puro (sem chart.js) para não pesar build.
- Toda mudança respeita design system (light/dark, cores semânticas Tailwind).
- Migration mínima: função `gerar_alertas_vencimento()` + cron via edge function diária (opcional, manual por enquanto via botão "Atualizar alertas" na página).

### Ordem de execução (commits lógicos)
1. Componentes base + utilitários (toolbar, modal, confirm, csv, charts, kpi-card).
2. CRUD + toolbar em Domínios, Licenças, Ativos.
3. CRUD + toolbar em Servidores, Manutenção, Movimentações, Estoque, Pagamentos.
4. CRUD em Governança (acessos/riscos) e Orçamentos.
5. Reescrita de Alertas + badge no sidebar + migration `gerar_alertas_vencimento`.
6. Reescrita do Dashboard e da Visão Economista com novos gráficos.

Confirma para eu começar pela etapa 1 e seguir até o fim?