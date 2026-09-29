import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AppState } from '../../../core/states/app-state.state';

const LAST_SYNC_KEY = 'lastSync';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar implements OnDestroy {
  private readonly appState = inject(AppState);
  private readonly router = inject(Router);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  readonly preSelectedLeagueName = computed(() => this.appState.league.preSelectedLeague()?.name);
  readonly preSelectedManagerId = computed(() => this.appState.league.preSelectedLeague()?.teamId);

  readonly dataLoading = this.appState.dataLoading;

  readonly menuOpen = signal(false);

  // --- Sincronización ---
  private readonly lastSync = signal<Date | null>(this.readLastSync());
  private readonly now = signal(Date.now());
  private readonly tickId = setInterval(() => this.now.set(Date.now()), 15000);

  readonly syncLabel = computed(() => {
    const last = this.lastSync();
    if (!last) return 'Sin sincronizar aún';

    const diffSec = Math.floor((this.now() - last.getTime()) / 1000);
    if (diffSec < 10) return 'Justo ahora';
    if (diffSec < 60) return `Hace ${diffSec}s`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;

    const diffH = Math.floor(diffMin / 60);
    return `Hace ${diffH} h`;
  });

  constructor() {
    // Detecta cuando termina una carga (ok o error) para marcar la sincronización
    let wasLoading = false;
    effect(() => {
      const loading = this.appState.dataLoading();
      const error = this.appState.dataError();

      if (wasLoading && !loading && !error) {
        this.markSynced();
      }
      wasLoading = loading;
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.tickId);
  }

  private readLastSync(): Date | null {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? new Date(raw) : null;
  }

  private markSynced(): void {
    const now = new Date();
    this.lastSync.set(now);
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
  }

  actualizarTendencias(): void {
    this.appState.refreshData();
  }

  cerrarSesion(): void {
    localStorage.clear();
    this.router.navigate(['/']); // ajusta a tu ruta de login si tienes una
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
