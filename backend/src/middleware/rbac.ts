import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from './auth';
import { canWrite, getProfileOrg, isAdmin } from '../profile';

export async function requireWriteAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  const uid = req.userId;
  if (!uid) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  if (!canWrite(prof.role)) {
    res.status(403).json({
      error: 'Sem permissão de escrita. O seu papel é somente leitura — contacte um gestor ou administrador.',
    });
    return;
  }
  next();
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const uid = req.userId;
  if (!uid) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  if (!isAdmin(prof.role)) {
    res.status(403).json({ error: 'Apenas administradores podem gerir o acesso.' });
    return;
  }
  next();
}
