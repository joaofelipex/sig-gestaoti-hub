/**
 * Âmbito dos dados na API (schema public).
 *
 * Leitura (SELECT): sempre todos os registos — org_id é metadado, não filtro de listagem.
 * Escrita (UPDATE/DELETE): DATA_SCOPE=org limita à org do perfil; DATA_SCOPE=all só por id.
 * INSERT: org_id do perfil é sempre atribuído nas rotas de dados.
 */
export type DataScope = 'all' | 'org';

export function getDataScope(): DataScope {
  const v = (process.env.DATA_SCOPE || 'all').trim().toLowerCase();
  return v === 'org' ? 'org' : 'all';
}

/** Escopo de escrita (UPDATE/DELETE). Leituras ignoram org_id. */
export function isOrgScoped(): boolean {
  return getDataScope() === 'org';
}

/** Cláusula WHERE para listagens em public.* — sempre todos os registos. */
export function sqlOrgReadScope(_orgParam = '$1'): string {
  return 'TRUE';
}

/** Cláusula para UPDATE/DELETE por id (paramOrg e paramId no final). */
export function sqlOrgWriteScope(orgParam: string, idParam: string): string {
  if (isOrgScoped()) {
    return `id = ${idParam}::uuid AND org_id = ${orgParam}::uuid`;
  }
  return `id = ${idParam}::uuid`;
}
