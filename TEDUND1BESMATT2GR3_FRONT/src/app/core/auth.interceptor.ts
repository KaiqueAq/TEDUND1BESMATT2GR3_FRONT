import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './config';

/** Coloca o login (Authorization) em toda chamada ao back e trata sessao expirada (401). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const header = auth.authorization;
  if (header && req.url.startsWith(API_URL) && !req.headers.has('Authorization')) {
    req = req.clone({ setHeaders: { Authorization: header } });
  }
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/me')) {
        auth.sair();
      }
      return throwError(() => err);
    }),
  );
};
