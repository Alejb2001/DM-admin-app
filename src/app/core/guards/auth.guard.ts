import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.initialized()) {
    return authService.isAuthenticated() ? true : router.createUrlTree(['/landing']);
  }

  return toObservable(authService.initialized).pipe(
    filter(init => init),
    take(1),
    map(() => authService.isAuthenticated() ? true : router.createUrlTree(['/landing']))
  );
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.initialized()) {
    return !authService.isAuthenticated() ? true : router.createUrlTree(['/campaigns']);
  }

  return toObservable(authService.initialized).pipe(
    filter(init => init),
    take(1),
    map(() => !authService.isAuthenticated() ? true : router.createUrlTree(['/campaigns']))
  );
};
