import { inject, PLATFORM_ID } from '@angular/core'; // 👈 Inyecta PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // 👈 Inyecta isPlatformBrowser
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID); // 👈 Detectamos si es servidor o cliente

  // 🚨 EL TRUCO PARA EVITAR EXPULSIÓN POR SSR:
  // Si estamos en el Servidor, dejamos pasar la ruta (devolvemos true).
  // No redirigimos al login todavía porque el servidor NO puede leer el localStorage.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Si ya estamos en el NAVEGADOR, hacemos la comprobación real con LocalStorage
  if (authService.isAuthenticated()) {
    console.log('User is authenticated (Browser)');
    return true;
  }

  console.log('User is not authenticated, redirecting to login');
  return router.createUrlTree(['/login']);
};
