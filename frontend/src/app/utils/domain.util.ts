import type { Domain } from '../services/dashboard.service';

/** Status oficiais de domínio no cadastro e no Painel. */
export const DOMAIN_STATUSES = ['Ativo', 'Expirando', 'Expirado', 'Não Renovado'] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

/**
 * Diferença em dias civis entre hoje e a data (yyyy-MM-dd).
 * Usa meio-dia local para evitar deslocamento por fuso/DST.
 */
export function daysUntilDate(date: string | null | undefined, today = new Date()): number {
  if (!date) return 999;
  const raw = String(date).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const ms = new Date(date).getTime() - today.getTime();
    if (Number.isNaN(ms)) return 999;
    return Math.ceil(ms / 86400000);
  }
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 999;
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const t1 = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((t1 - t0) / 86400000);
}

function normalizeStatusKey(status: string | null | undefined): string {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** Normaliza rótulos legados (ex.: Inativo → Não Renovado). */
export function normalizeDomainStatus(status: string | null | undefined): DomainStatus | string {
  const k = normalizeStatusKey(status);
  if (!k || k === 'ativo' || k === 'active') return 'Ativo';
  if (k === 'expirando' || k === 'expiring') return 'Expirando';
  if (k === 'expirado' || k === 'expired') return 'Expirado';
  // Inclui legado "Inativo" e variantes com encoding corrompido.
  if (
    k === 'nao renovado' ||
    k === 'inativo' ||
    k === 'inactive' ||
    k.includes('renovado') ||
    /^n.o renovado$/.test(k)
  ) {
    return 'Não Renovado';
  }
  return String(status || '').trim() || 'Ativo';
}

export function isDomainNotRenewed(domain: Pick<Domain, 'status'>): boolean {
  return normalizeDomainStatus(domain.status) === 'Não Renovado';
}

export function isDomainExpired(domain: Pick<Domain, 'expirationDate' | 'status'>): boolean {
  // Domínios deliberadamente não renovados não entram como "Expirado" operacional.
  if (isDomainNotRenewed(domain)) return false;
  if (domain.expirationDate) return daysUntilDate(domain.expirationDate) <= 0;
  return normalizeDomainStatus(domain.status) === 'Expirado';
}

/** Domínios ativos que vencem em até 30 dias (exclui expirados e não renovados). */
export function isDomainExpiringSoon(
  domain: Pick<Domain, 'expirationDate' | 'status'>,
  withinDays = 30,
): boolean {
  if (!domain.expirationDate || isDomainNotRenewed(domain) || isDomainExpired(domain)) return false;
  const left = daysUntilDate(domain.expirationDate);
  return left > 0 && left <= withinDays;
}

/**
 * Status efetivo para gráficos/KPI.
 * Não Renovado é preservado; nos demais, a data de vencimento prevalece.
 */
export function effectiveDomainStatus(domain: Pick<Domain, 'expirationDate' | 'status'>): string {
  if (isDomainNotRenewed(domain)) return 'Não Renovado';
  if (isDomainExpired(domain)) return 'Expirado';
  if (isDomainExpiringSoon(domain)) return 'Expirando';
  const normalized = normalizeDomainStatus(domain.status);
  if (normalized === 'Expirando' || normalized === 'Expirado') return 'Ativo';
  return normalized || 'Ativo';
}

export function countExpiredDomains(domains: Pick<Domain, 'expirationDate' | 'status'>[]): number {
  return domains.filter(isDomainExpired).length;
}

export function countExpiringDomains(
  domains: Pick<Domain, 'expirationDate' | 'status'>[],
  withinDays = 30,
): number {
  return domains.filter((d) => isDomainExpiringSoon(d, withinDays)).length;
}
