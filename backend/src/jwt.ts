import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-me-in-production';

export type JwtPayload = { sub: string; email?: string };

export function signToken(payload: JwtPayload, expiresIn = '7d'): string {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
