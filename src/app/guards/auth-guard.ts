import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.checkStatus().pipe(
    map(status => {
      if (status.authenticated) {
        return true;
      }
      sessionStorage.setItem('redirectUrl', state.url);
      return router.createUrlTree(['/login']);
    }),
    catchError(() => {
      sessionStorage.setItem('redirectUrl', state.url);
      return of(router.createUrlTree(['/login']));
    })
  );
};
