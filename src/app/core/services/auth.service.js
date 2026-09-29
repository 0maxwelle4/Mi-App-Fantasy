import { __decorate } from 'tslib';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
let AuthService = class AuthService {
  // Inyectamos el ID de la plataforma actual (Servidor o Navegador)
  platformId = inject(PLATFORM_ID);
  isAuthenticated() {
    // Si estamos en el Servidor (SSR), asumimos que no está autenticado temporalmente
    if (!isPlatformBrowser(this.platformId)) {
      console.log('isAuthenticated (SSR): False (Server context)');
      return false;
    }
    // Si estamos en el Navegador, ejecutamos tu lógica real de manera segura
    const token = localStorage.getItem('laliga_token');
    console.log('isAuthenticated (Browser):', !!token);
    return !!token;
  }
};
AuthService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  AuthService,
);
export { AuthService };
