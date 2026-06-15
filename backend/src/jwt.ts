import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'dev-only-change-me-in-production';
const SECRET = (process.env.JWT_SECRET?.trim()) || DEFAULT_SECRET;

export type JwtPayload = { sub: string; email?: string };

export function requireJwtSecret(): void {
  if (SECRET === DEFAULT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET não pode ser o valor padrão em production. Defina um segredo seguro em backend/.env.');
    }
    console.warn(
      '[JWT] Aviso: usando segredo JWT padrão. Altere JWT_SECRET em backend/.env para maior segurança.',
    );
  }
}

export function signToken(payload: JwtPayload, expiresIn = '7d'): string {
  // @ts-ignore - jsonwebtoken types have issues with our usage
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
