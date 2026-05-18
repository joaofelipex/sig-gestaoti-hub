/** Chave lógica: CNPJ (global) ou nome normalizado (global). */
export const EMPRESA_DEDUPE_KEY_SQL = `
  CASE
    WHEN length(regexp_replace(coalesce(e.cnpj, ''), '[^0-9]', '', 'g')) >= 11 THEN
      'c:' || regexp_replace(coalesce(e.cnpj, ''), '[^0-9]', '', 'g')
    WHEN length(btrim(coalesce(e.nome, ''))) > 0 THEN
      'n:' || lower(regexp_replace(btrim(e.nome), '[[:space:]]+', ' ', 'g'))
    ELSE 'i:' || e.id::text
  END
`;

/** Lista empresas sem repetir CNPJ/nome (fica o registo mais recente). */
export const EMPRESAS_UNIQUE_SQL = `
  WITH keyed AS (
    SELECT e.*, ${EMPRESA_DEDUPE_KEY_SQL} AS dedupe_key
    FROM public.empresas e
  ),
  ranked AS (
    SELECT *,
      row_number() OVER (
        PARTITION BY dedupe_key
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
      ) AS rn
    FROM keyed
  )
  SELECT id, org_id, nome, cnpj, segmento, responsavel, ativo, observacoes, created_at, updated_at
  FROM ranked
  WHERE rn = 1
  ORDER BY nome, updated_at DESC NULLS LAST
`;

function normalizeCnpj(cnpj: unknown): string {
  return String(cnpj ?? '').replace(/\D/g, '');
}

function normalizeNome(nome: unknown): string {
  return String(nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

export function dedupeEmpresaRows<
  T extends {
    id: string;
    nome?: string | null;
    cnpj?: string | null;
    updated_at?: string | Date | null;
    created_at?: string | Date | null;
  },
>(rows: T[]): T[] {
  const byKey = new Map<string, T>();

  for (const row of rows) {
    const key = empresaLogicalKey(row);
    const prev = byKey.get(key);
    if (!prev || empresaRowScore(row) > empresaRowScore(prev)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()].sort((a, b) =>
    String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR'),
  );
}

function empresaLogicalKey(row: {
  id: string;
  nome?: string | null;
  cnpj?: string | null;
}): string {
  const cnpj = normalizeCnpj(row.cnpj);
  if (cnpj.length >= 11) return `cnpj:${cnpj}`;
  const nome = normalizeNome(row.nome);
  if (nome) return `nome:${nome}`;
  return `id:${row.id}`;
}

function empresaRowScore(row: {
  updated_at?: string | Date | null;
  created_at?: string | Date | null;
}): number {
  for (const d of [row.updated_at, row.created_at]) {
    if (!d) continue;
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}
