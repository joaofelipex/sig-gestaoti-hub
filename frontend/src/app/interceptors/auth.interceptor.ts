import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_STORAGE_KEY } from '../services/auth-storage';

function isApiRequest(url: string, apiUrl: string): boolean {
  const base = apiUrl.replace(/\/$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return url.startsWith(base);
  }
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
    const prefix = base.startsWith('/') ? base : `/${base}`;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  } catch {
    return url.startsWith(base);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url, environment.apiUrl)) {
    return next(req);
  }
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
