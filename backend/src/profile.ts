import { pool } from './db';

export type AppRole = 'admin' | 'gestor' | 'usuario';

export interface ProfileOrg {
  org_id: string;
  email: string;
  nome: string;
  avatar_url: string | null;
  org_nome: string;
  role: AppRole;
}

/** admin e gestor alteram dados; usuario é somente leitura. */
export function canWrite(role: AppRole): boolean {
  return role === 'admin' || role === 'gestor';
}

export function isAdmin(role: AppRole): boolean {
  return role === 'admin';
}

export function isAppRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'gestor' || value === 'usuario';
}

export async function getProfileOrg(userId: string): Promise<ProfileOrg | undefined> {
  const q = await pool.query(
    `SELECT p.org_id, p.email, p.nome, p.avatar_url, o.nome AS org_nome,
            COALESCE(ur.role, 'usuario'::public.app_role) AS role
     FROM public.profiles p
     JOIN public.organizations o ON o.id = p.org_id
     LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.org_id = p.org_id
     WHERE p.user_id = $1
     LIMIT 1`,
    [userId],
  );
  return q.rows[0] as ProfileOrg | undefined;
}
