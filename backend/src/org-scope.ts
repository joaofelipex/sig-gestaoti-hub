/**
 * Âmbito dos dados visíveis na API.
 *
 * DATA_SCOPE=all  → todos os registos (desenvolvimento; ignora org_id na leitura)
 * DATA_SCOPE=org  → só org_id do perfil (multi-tenant)
 *
 * Por defeito: all (até atribuir org_id/empresa_id aos registos).
 */
export type DataScope = 'all' | 'org';

export function getDataScope(): DataScope {
  const v = (process.env.DATA_SCOPE || 'all').trim().toLowerCase();
  return v === 'org' ? 'org' : 'all';
}

export function isOrgScoped(): boolean {
  return getDataScope() === 'org';
}

/** Cláusula WHERE para listagens (paramOrg ex.: $1). */
export function sqlOrgReadScope(orgParam = '$1'): string {
  if (isOrgScoped()) {
    return `org_id = ${orgParam}`;
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
