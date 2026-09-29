import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiAuthLoginService } from './services/api-auth-login.service';
import { AppState } from '../../core/states/app-state.state';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'auth-login.html',
  styleUrl: 'auth-login.scss',
})
export class AuthLoginComponent implements OnInit {
  // INJECTS
  private apiServiceAuth = inject(ApiAuthLoginService);
  private router = inject(Router);
  private readonly appState = inject(AppState);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  showPassword = false;
  isSubmitting = signal(false);
  statusMessage = '';
  public errorMessage: string = '';

  jornada = 'JORNADA 14 · TEMP. 25/26';

  ngOnInit(): void {
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

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.statusMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, password, remember } = this.form.value;

    this.apiServiceAuth.loginDirecto(email, password).subscribe({
      next: (response) => {
        this.isSubmitting.set(false); // 👈 Quitamos el estado cargando
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
          this.appState.loadInitialData();
          this.toastr.success('Se ha iniciado Correctamente tu session!');
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = 'No se ha recibido un token de identidad válido.';
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage = 'Credenciales incorrectas o error en la pasarela de LaLiga.';
        this.toastr.error(this.errorMessage);
        console.error(err);
      },
    });
  }
}
