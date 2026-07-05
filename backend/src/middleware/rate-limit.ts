import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress || 'unknown';
  return `${ip}:${req.path}`;
}

/** Rate limit simples em memória para rotas de autenticação (login/signup). */
export function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = clientKey(req);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    const retrySec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.' });
    return;
  }
  next();
}
