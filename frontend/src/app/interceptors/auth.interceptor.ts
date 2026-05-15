import { HttpInterceptorFn } from '@angular/common/http';
import { API_TOKEN_STORAGE_KEY } from '../core/api.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(API_TOKEN_STORAGE_KEY) : null;
  if (token && !req.headers.has('Authorization')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
