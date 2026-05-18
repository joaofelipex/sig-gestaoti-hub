import { pool } from './db';
import { countEmpresaDuplicateGroups, dedupeEmpresasInDatabase } from './empresa-dedupe-db';

/** Ao arrancar a API: limpa duplicatas de empresas se existirem. */
export async function ensureEmpresasUniqueOnStartup(): Promise<void> {
  const groups = await countEmpresaDuplicateGroups(pool);
  if (groups === 0) return;

  console.log(`[data] empresas: ${groups} grupo(s) duplicado(s) — a limpar automaticamente…`);
  const result = await dedupeEmpresasInDatabase(pool);
  console.log(
    `[data] empresas deduplicadas: ${result.before} → ${result.after} (removidas ${result.removed}, FKs ${result.relinked})`,
  );
}
