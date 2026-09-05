import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { UpgradeService } from '../services/upgrade.service';

export const upgradeInterceptor: HttpInterceptorFn = (req, next) => {
  const upgradeService = inject(UpgradeService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 402) {
        upgradeService.handleLimitReached(error.error);
      }
      return throwError(() => error);
    })
  );
};
