-- Empresas da holding demo (org IMTS) — idempotente.
INSERT INTO public.empresas (id, org_id, nome, cnpj, segmento, responsavel, ativo)
VALUES
  (
    '33333333-3333-3333-3333-333333333334',
    '22222222-2222-2222-2222-222222222222',
    'IMTS Digital',
    '22.222.222/0001-22',
    'Software',
    'Produtos Digitais',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333335',
    '22222222-2222-2222-2222-222222222222',
    'IMTS Saúde',
    '33.333.333/0001-33',
    'Saúde',
    'Operações Clínicas',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333336',
    '22222222-2222-2222-2222-222222222222',
    'IMTS Educação',
    '44.444.444/0001-44',
    'Educação',
    'Gestão Acadêmica',
    true
  )
ON CONFLICT (id) DO NOTHING;
