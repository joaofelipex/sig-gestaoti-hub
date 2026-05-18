-- Dados de demonstração (IMTS) — reaplicável.
-- Docker (5433): corre após 01_schema no primeiro init; ou `npm run db:seed`.
-- Supabase CLI (54322): usa `supabase/seed.sql` (após `npm run local:stack` / `supabase db reset`).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM public.termos_responsabilidade WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.inventario_movimentacoes WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.pagamentos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.riscos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.registros_acesso WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.acoes_economista WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.orcamentos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.alertas WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.inventario WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.movimentacoes WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.manutencoes WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.contratos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.servidores WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.licencas WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.dns_records WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.dominios WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.ativos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.user_roles WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.profiles WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.usuarios WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.departamentos WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.empresas WHERE org_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.organizations WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';

INSERT INTO auth.users (id, email, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dev@local.imts', now());

INSERT INTO public.organizations (id, nome, cnpj, plano) VALUES
  ('22222222-2222-2222-2222-222222222222', 'IMTS Holding Demo', '00.000.000/0001-00', 'local');

INSERT INTO public.profiles (id, user_id, org_id, email, nome) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'dev@local.imts', 'Utilizador Demo');

INSERT INTO public.user_roles (user_id, org_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'admin');

INSERT INTO public.empresas (id, org_id, nome, cnpj, segmento, responsavel, ativo) VALUES
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'IMTS Matriz', '11.111.111/0001-11', 'Tecnologia', 'TI Corporativo', true),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 'IMTS Digital', '22.222.222/0001-22', 'Software', 'Produtos Digitais', true),
  ('33333333-3333-3333-3333-333333333335', '22222222-2222-2222-2222-222222222222', 'IMTS Saúde', '33.333.333/0001-33', 'Saúde', 'Operações Clínicas', true),
  ('33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222222', 'IMTS Educação', '44.444.444/0001-44', 'Educação', 'Gestão Acadêmica', true);

INSERT INTO public.departamentos (id, org_id, nome, centro_custo, empresa_id) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Operações TI', 'CC-TI-01', '33333333-3333-3333-3333-333333333333');

INSERT INTO public.usuarios (id, org_id, departamento_id, nome, email, cargo, ativo, empresa_id) VALUES
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Ana Costa', 'ana.costa@local.imts', 'Analista', true, '33333333-3333-3333-3333-333333333333');

INSERT INTO public.ativos (id, org_id, empresa_id, tipo, status, marca, modelo, numero_serie, department_nome, data_aquisicao, valor_aquisicao, assigned_to) VALUES
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Notebook', 'ativo', 'Dell', 'Latitude 5540', 'SN-DEMO-001', 'Operações TI', '2024-03-15', 5200, 'ana.costa@local.imts'),
  ('66666666-6666-6666-6666-666666666667', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Monitor', 'estoque', 'LG', '27UL850', 'SN-DEMO-002', 'Operações TI', '2024-06-01', 1800, NULL);

INSERT INTO public.dominios (id, org_id, empresa_id, nome, registrar, data_vencimento, custo_anual, custo_renovacao, auto_renovacao, dns_provider, hosting_provider, ssl_vencimento, status) VALUES
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'imts-demo.local', 'Registro.br', '2026-08-01', 120, 120, true, 'Cloudflare', 'Vercel', '2026-07-15', 'Ativo');

INSERT INTO public.licencas (id, org_id, empresa_id, nome, categoria, tipo, total_licencas, qtd_usuarios, custo_unitario, custo_mensal, data_renovacao, fornecedor) VALUES
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Microsoft 365 E3', 'Produtividade', 'Anual', 50, 42, 45, 187.5, '2026-01-10', 'Microsoft');

INSERT INTO public.servidores (id, org_id, empresa_id, nome, provedor, tipo, regiao, ip_publico, sistema_operacional, cpu, ram, armazenamento, status, uptime_pct, custo_mensal, finalidade, contrato_fim, ssl_vencimento) VALUES
  ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'api-demo-01', 'AWS', 't3.medium', 'sa-east-1', '203.0.113.10', 'Ubuntu 22.04', '2 vCPU', '4 GB', '80 GB SSD', 'Online', 99.9, 320, 'API interna', '2026-12-31', '2026-11-01');

INSERT INTO public.contratos (id, org_id, empresa_id, supplier, object, type, status, monthly_cost, cost_center, end_date) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'AWS', 'Hospedagem workloads', 'Infraestrutura', 'Ativo', 1200, 'CC-TI-01', '2027-06-30');

INSERT INTO public.manutencoes (id, org_id, empresa_id, ativo_id, tipo, status, data_abertura, data_conclusao, custo, fornecedor, descricao) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'Preventiva', 'Concluída', '2025-11-01', '2025-11-02', 150, 'TI interno', 'Limpeza e BIOS');

INSERT INTO public.movimentacoes (id, org_id, empresa_id, ativo_id, ativo_label, tipo, data, from_department, to_department, reason) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'Dell Latitude 5540', 'Transferência', '2025-10-10', 'Logística', 'Operações TI', 'Projeto novo');

INSERT INTO public.inventario (id, org_id, empresa_id, nome, categoria, quantity, min_quantity, unit, unit_cost, location, supplier, sku) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Cabo rede Cat6 3m', 'Cabos', 120, 20, 'un', 12.5, 'Armazém A', 'Furukawa', 'CAT6-3M');

INSERT INTO public.inventario_movimentacoes (id, org_id, empresa_id, item_id, item_name, tipo, data, quantity, unit_cost, destination, reason, responsible) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Cabo rede Cat6 3m', 'Saída', '2025-12-01', 10, 12.5, 'Operações TI', 'Reposição de stock', 'Ana Costa');

INSERT INTO public.alertas (id, org_id, empresa_id, titulo, tipo, severidade, mensagem, lida, link) VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'SSL a vencer', 'dominio', 'aviso', 'imts-demo.local SSL expira em <30 dias', false, '/dominios'),
  ('f0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Incidente crítico simulado', 'infra', 'critico', 'Teste de alerta crítico (dados demo)', false, '/alertas');

INSERT INTO public.orcamentos (id, org_id, empresa_id, year, category, cost_center, annual_budget, notes) VALUES
  ('10101010-1010-1010-1010-101010101010', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 2026, 'Infraestrutura', 'CC-TI-01', 480000, 'Planeamento anual demo');

INSERT INTO public.acoes_economista (id, org_id, empresa_id, title, description, category, priority, effort, status, owner, due_date, estimated_savings) VALUES
  ('20202020-2020-2020-2020-202020202020', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Direitosizing reserved instances', 'Rever instâncias m5 reservadas na região SP', 'FinOps', 'Alta', 'M', 'Aberto', 'Economista TI', '2026-03-31', 42000);

INSERT INTO public.registros_acesso (id, org_id, empresa_id, usuario_id, user_label, sistema, recurso, recurso_tipo, nivel_acesso, data_concessao, ultimo_acesso, ativo) VALUES
  ('30303030-3030-3030-3030-303030303030', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Ana Costa', 'ERP', 'Módulo financeiro', 'módulo', 'Leitura', '2025-01-10', '2025-12-01', true);

INSERT INTO public.riscos (id, org_id, empresa_id, title, severity, owner, mitigation) VALUES
  ('40404040-4040-4040-4040-404040404040', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Chave API exposta em repositório', 'Alta', 'Segurança', 'Rotação de chaves + scan de segredos');

INSERT INTO public.pagamentos (id, org_id, empresa_id, nome, categoria, competencia, valor, status, vencimento, data_pagamento, fornecedor) VALUES
  ('50505050-5050-5050-5050-505050505050', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Fatura AWS Nov/25', 'servidor', '2025-11', 1180.50, 'pago', '2025-11-10', '2025-11-08', 'AWS'),
  ('50505050-5050-5050-5050-505050505051', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Renovação domínio', 'dominio', '2026-01', 120, 'pendente', '2026-01-28', NULL, 'Registro.br');

-- Palavra-passe demo (dev@local.imts / demo123456)
UPDATE auth.users
SET encrypted_password = crypt('demo123456', gen_salt('bf'))
WHERE id = '11111111-1111-1111-1111-111111111111'
  AND (encrypted_password IS NULL OR encrypted_password = '');

COMMIT;
