import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { timeout, catchError, throwError } from 'rxjs'; // 1. Importa esto

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  const urlRealAzure =
    'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2';

  // Si estamos en el SERVIDOR (SSR)
  if (!isBrowser) {
    return next(req).pipe(
      timeout(4000), // 2. Si la API tarda más de 4s en el servidor, aborta y no cuelga la app
      catchError((err) => {
        console.error(`Petición fallida o timeout en SSR para: ${req.url}`);
        return throwError(() => err);
      }),
    );
  }

  // Si estamos en el NAVEGADOR (Código original)
  const token = localStorage.getItem('laliga_token');

  if (token && req.url !== urlRealAzure) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return next(cloned);
  }

  return next(req);
};
