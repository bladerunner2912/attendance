import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { SnackbarService } from './snackbar';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const snackbar = inject(SnackbarService);

  const token = auth.getToken();

  if (!token) {
    snackbar.show('Please log in to access the dashboard.', 'info');
    return router.parseUrl('/login');
  }

  return true;
};
