/**
 * Âmbito dos dados na API (schema public).
 *
 * Leitura (SELECT): quando em modo org, filtra por org_id.
 * Escrita (UPDATE/DELETE): DATA_SCOPE=org limita à org do perfil; DATA_SCOPE=all só por id.
 * INSERT: org_id do perfil é sempre atribuído nas rotas de dados.
 */
export type DataScope = 'all' | 'org';

export function getDataScope(): DataScope {
  const v = (process.env.DATA_SCOPE || 'org').trim().toLowerCase();
  return v === 'all' ? 'all' : 'org';
}

/** Escopo de escrita (UPDATE/DELETE). Leituras usam org_id quando configurado. */
export function isOrgScoped(): boolean {
  return getDataScope() === 'org';
}

/** Cláusula WHERE para listagens em public.*. */
export function sqlOrgReadScope(orgParam = '$1'): string {
  if (isOrgScoped()) {
    return `org_id = ${orgParam}::uuid`;
  }
  return 'TRUE';
}

/** Cláusula para UPDATE/DELETE por id (paramOrg e paramId no final). */
export function sqlOrgWriteScope(orgParam: string, idParam: string): string {
  if (isOrgScoped()) {
    return `id = ${idParam}::uuid AND org_id = ${orgParam}::uuid`;
  }
  return `id = ${idParam}::uuid`;
}
