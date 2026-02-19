import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { Auth } from './auth';
import { SnackbarService } from './snackbar';
import { LoaderService } from './loader';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const snackbar = inject(SnackbarService);
  const loader = inject(LoaderService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  loader.show();
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (error.status === 401 && !isAuthEndpoint) {
        auth.logout();
        router.navigate(['/login']);
      }
      const message = error.error?.message || error.message || 'Request failed';
      snackbar.show(message, 'error');
      return throwError(() => error);
    }),
    finalize(() => loader.hide())
  );
};
