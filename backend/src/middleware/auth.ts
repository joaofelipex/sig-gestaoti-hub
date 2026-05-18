import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../jwt';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const tok = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }
  try {
    const p = verifyToken(tok);
    req.userId = p.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }
}
