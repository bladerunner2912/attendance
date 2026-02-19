import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { Auth } from './auth';
import { SnackbarService } from './snackbar';
import { LoaderService } from './loader';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
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
      const message = error.error?.message || error.message || 'Request failed';
      snackbar.show(message, 'error');
      return throwError(() => error);
    }),
    finalize(() => loader.hide())
  );
};
