import { __decorate } from 'tslib';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiAuthLoginService } from './services/api-auth-login.service';
let AuthLoginComponent = class AuthLoginComponent {
  // INJECTS
  apiServiceAuth = inject(ApiAuthLoginService);
  router = inject(Router);
  fb = inject(FormBuilder);
  platformId = inject(PLATFORM_ID);
  form;
  showPassword = false;
  isSubmitting = false;
  statusMessage = '';
  errorMessage = '';
  jornada = 'JORNADA 14 · TEMP. 25/26';
  ngOnInit() {
    // 1. Inicializar formulario vacío por defecto
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
    // 2. Si estamos en el navegador, recuperar las credenciales recordadas
    if (isPlatformBrowser(this.platformId)) {
      const savedEmail = localStorage.getItem('remembered_email');
      const savedPassword = localStorage.getItem('remembered_password');
      if (savedEmail) {
        this.form.patchValue({
          email: savedEmail,
          password: savedPassword,
          remember: true,
        });
      }
    }
  }
  get email() {
    return this.form.get('email');
  }
  get password() {
    return this.form.get('password');
  }
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  onSubmit() {
    this.statusMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const { email, password, remember } = this.form.value;
    this.apiServiceAuth.loginDirecto(email, password).subscribe({
      next: (response) => {
        this.isSubmitting = false; // 👈 Quitamos el estado cargando
        const tokenValido = response.id_token || response.access_token;
        if (tokenValido) {
          console.log('Autenticación exitosa', response);
          // 🔐 MANEJO DEL "RECORDARME"
          if (isPlatformBrowser(this.platformId)) {
            if (remember) {
              localStorage.setItem('remembered_email', email.trim());
              localStorage.setItem('remembered_password', password.trim());
            } else {
              localStorage.removeItem('remembered_email');
              localStorage.removeItem('remembered_password');
            }
          }
          // Guardar los tokens principales
          localStorage.setItem('laliga_token', tokenValido);
          if (response.refresh_token) {
            localStorage.setItem('laliga_refresh_token', response.refresh_token);
          }
          // Guardar tiempos de expiración del token
          const ahora = Date.now();
          localStorage.setItem('token_requested_at', ahora.toString());
          const segundosParaExpirar = parseInt(response.expires_in, 10) || 3600;
          const tiempoExpiracionMilisegundos = ahora + segundosParaExpirar * 1000;
          localStorage.setItem('token_expires_at', tiempoExpiracionMilisegundos.toString());
          // Navegar al Home
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = 'No se ha recibido un token de identidad válido.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Credenciales incorrectas o error en la pasarela de LaLiga.';
        console.error(err);
      },
    });
  }
};
AuthLoginComponent = __decorate(
  [
    Component({
      selector: 'app-login',
      standalone: true,
      imports: [CommonModule, ReactiveFormsModule],
      templateUrl: 'auth-login.html',
      styleUrl: 'auth-login.scss',
    }),
  ],
  AuthLoginComponent,
);
export { AuthLoginComponent };
