import { Component, computed, effect, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, finalize, of, switchMap, tap } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ApiCalendarService } from './services/api-calendar.service';
import { CurrentWeekInterface } from '../../shared/interfaces/calendar/current-week.interface';
import {
  WeekStatsInterface,
  PlayerStatInterface,
} from '../../shared/interfaces/calendar/week-stats.interface';
import { AppState } from '../../core/states/app-state.state';
import { PlayerStatsModal } from '../../shared/modals/player-stats-modal/player-stats-modal';

const POS_LABEL: Record<number, string> = {
  1: 'Portero',
  2: 'Defensa',
  3: 'Centrocampista',
  4: 'Delantero',
  5: 'Entrenador',
};
const POS_ORDER = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-calendar',
  imports: [DecimalPipe, DatePipe, PlayerStatsModal],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  // ==========================================================
  // SERVICES
  // ==========================================================

  protected readonly appState = inject(AppState);
  private readonly apiCalendar = inject(ApiCalendarService);

  // ==========================================================
  // LOADING
  // ==========================================================

  /**
   * Loading inicial:
   * temporada + jornada actual.
   */
  readonly loading = signal(true);

  /**
   * Loading de los partidos.
   *
   * Se activa cada vez que cambiamos de jornada
   * (y tambien en cada refresco manual).
   */
  readonly loadingFixtures = signal(true);

  readonly loadingStats = signal(false);

  /**
   * Loading visual del boton "Refrescar".
   *
   * Se activa al pulsar el boton y se apaga automaticamente
   * cuando season, fixtures y stats han terminado de recargar.
   */
  readonly calendarLoading = signal(false);

  /**
   * Numero de skeletons que mostramos.
   */
  readonly skeletonFixtures = Array.from({ length: 9 }, (_, index) => index);

  // ==========================================================
  // ERRORS
  // ==========================================================

  readonly fixturesError = signal<string | null>(null);
  readonly statsError = signal<string | null>(null);

  // ==========================================================
  // SELECTED WEEK (como estaba originalmente)
  // ==========================================================

  readonly selectedWeek = signal<number>(1);

  // ==========================================================
  // REFRESH TRIGGER
  // ==========================================================

  /**
   * Cada vez que se incrementa, fuerza a season details,
   * current week, fixtures y week stats a volver a pedirse
   * a la API, aunque la jornada seleccionada no haya cambiado.
   */
  private readonly refreshTrigger = signal(0);

  constructor() {
    effect(
      () => {
        const initialWeek = this.currentWeek()?.weekNumber;

        if (initialWeek) {
          this.selectedWeek.set(initialWeek);
        }
      },
      {
        allowSignalWrites: true,
      },
    );

    // Apaga el spinner del boton "Refrescar" en cuanto
    // season, fixtures y stats han terminado de recargar.
    effect(
      () => {
        const stillLoading = this.loading() || this.loadingFixtures() || this.loadingStats();

        if (this.calendarLoading() && !stillLoading) {
          this.calendarLoading.set(false);
        }
      },
      {
        allowSignalWrites: true,
      },
    );
  }

  // ============================================================
  // REFRESH
  // ============================================================

  /**
   * Refresca todo el calendario: temporada, jornada actual,
   * partidos de la jornada seleccionada y sus estadisticas.
   */
  refresh(): void {
    if (this.calendarLoading()) {
      return;
    }

    this.calendarLoading.set(true);

    // Vaciamos la cache de stats para que la jornada actual
    // tambien se vuelva a pedir en vez de servirse de cache.
    this.weekStatsCache.set(new Map());

    this.refreshTrigger.update((current) => current + 1);
  }

  // ============================================================
  // PLAYERS STATS
  // ============================================================

  showPlayerStats = false;
  selectedPlayerId: string | null = null;

  closePlayerStats(): void {
    this.showPlayerStats = false;

    this.selectedPlayerId = null;
  }

  openPlayerStats(playerId: number): void {
    this.selectedPlayerId = playerId.toString();

    this.showPlayerStats = true;
  }

  // ==========================================================
  // ¿ESTÁ JUGADO / EN JUEGO EL PARTIDO? (clicable)
  // ==========================================================

  isPlayed(match: { localScore: number | null; visitorScore: number | null }): boolean {
    return match.localScore !== null && match.visitorScore !== null;
  }

  // ==========================================================
  // MODAL DE STATS
  // ==========================================================

  readonly selectedMatchId = signal<number | null>(null);

  openStats(match: { id: number; localScore: number | null; visitorScore: number | null }): void {
    if (!this.isPlayed(match)) {
      return;
    }
    this.selectedMatchId.set(match.id);
  }

  closeStats(): void {
    this.selectedMatchId.set(null);
  }

  positionLabel(positionId: number): string {
    return POS_LABEL[positionId] ?? '';
  }

  ptsClass(points: number): 'pos' | 'neg' | 'zero' {
    return points > 0 ? 'pos' : points < 0 ? 'neg' : 'zero';
  }

  groupPlayersByPosition(
    players: PlayerStatInterface[],
  ): { positionId: number; label: string; players: PlayerStatInterface[] }[] {
    const byPos = new Map<number, PlayerStatInterface[]>();

    players.forEach((p) => {
      const list = byPos.get(p.positionId) ?? [];
      list.push(p);
      byPos.set(p.positionId, list);
    });

    return POS_ORDER.filter((pid) => byPos.has(pid)).map((pid) => ({
      positionId: pid,
      label: POS_LABEL[pid],
      players: [...(byPos.get(pid) ?? [])].sort((a, b) => b.weekPoints - a.weekPoints),
    }));
  }

  // ==========================================================
  // SEASON DETAILS
  // ==========================================================

  readonly seasonDetails = toSignal(
    toObservable(this.refreshTrigger).pipe(
      switchMap(() =>
        this.apiCalendar.getSeasonDetails().pipe(
          tap((fixtures) => {
            console.log('Season details:', fixtures);
          }),

          catchError((err) => {
            console.error('Error cargando season details', err);
            return of(null);
          }),

          finalize(() => {
            this.loading.set(false);
          }),
        ),
      ),
    ),

    {
      initialValue: [],
    },
  );

  // ==========================================================
  // WEEKS
  // ==========================================================

  readonly jornadasArray = computed(() => {
    const total = this.seasonDetails()?.current?.totalFixtures || 0;

    return Array.from(
      {
        length: total,
      },
      (_, i) => i + 1,
    );
  });

  // ==========================================================
  // CURRENT WEEK
  // ==========================================================

  readonly currentWeek: Signal<CurrentWeekInterface> = toSignal(
    toObservable(this.refreshTrigger).pipe(
      switchMap(() =>
        this.apiCalendar.getCurrentWeek().pipe(
          tap((fixtures) => {
            console.log('Current week:', fixtures);
          }),

          catchError((err) => {
            console.error('Error cargando current week', err);
            return of({
              isLive: false,
              nextWeek: 2,
              weekNumber: 1,
              openingWeekDate: '',
              closingWeekDate: '',
            });
          }),
        ),
      ),
    ),

    {
      initialValue: {
        isLive: false,
        nextWeek: 2,
        weekNumber: 1,
        openingWeekDate: '',
        closingWeekDate: '',
      },
    },
  );

  // ==========================================================
  // FIXTURES
  // ==========================================================

  readonly allFixtures = toSignal(
    combineLatest([toObservable(this.selectedWeek), toObservable(this.refreshTrigger)]).pipe(
      tap(() => {
        this.loadingFixtures.set(true);
      }),

      switchMap(([weekNumber]) =>
        this.apiCalendar.getFixtures(weekNumber).pipe(
          finalize(() => {
            this.loadingFixtures.set(false);
          }),
        ),
      ),
    ),

    {
      initialValue: [],
    },
  );

  // ==========================================================
  // WEEK STATS — con CACHÉ por jornada
  // ==========================================================

  private readonly weekStatsCache = signal<Map<number, WeekStatsInterface[]>>(new Map());

  readonly weekStats: Signal<WeekStatsInterface[]> = toSignal(
    combineLatest([toObservable(this.selectedWeek), toObservable(this.refreshTrigger)]).pipe(
      switchMap(([weekNumber]) => {
        const cached = this.weekStatsCache().get(weekNumber);

        if (cached) {
          this.statsError.set(null);
          return of(cached);
        }

        this.loadingStats.set(true);
        this.statsError.set(null);

        return this.apiCalendar.getWeekStats(weekNumber).pipe(
          tap((data) => {
            const newCache = new Map(this.weekStatsCache());
            newCache.set(weekNumber, data);
            this.weekStatsCache.set(newCache);
          }),

          catchError((err) => {
            console.error('Error cargando stats de la jornada', weekNumber, err);
            this.statsError.set('No se pudieron cargar las estadísticas de esta jornada.');
            return of([]);
          }),

          finalize(() => {
            this.loadingStats.set(false);
          }),
        );
      }),
    ),

    {
      initialValue: [],
    },
  );

  readonly selectedMatchStats = computed(() => {
    const matchId = this.selectedMatchId();

    if (matchId === null) {
      return null;
    }

    return this.weekStats().find((m) => Number(m.id) === Number(matchId)) ?? null;
  });

  /** MVP del partido: jugador con más puntos entre ambos equipos. */
  readonly selectedMatchMvpId = computed(() => {
    const stats = this.selectedMatchStats();
    if (!stats) return null;

    const all = [...stats.local.players, ...stats.visitor.players];

    return (
      all.reduce<PlayerStatInterface | null>(
        (best, p) => (p.weekPoints > (best ? best.weekPoints : -Infinity) ? p : best),
        null,
      )?.id ?? null
    );
  });

  // ==========================================================
  // GROUP FIXTURES BY DATE (tal cual estaba)
  // ==========================================================

  readonly fixturesByDate = computed(() => {
    const partidos = this.allFixtures() || [];

    const grupos: {
      [key: string]: any[];
    } = {};

    const teamsById = this.appState.teams.teamsById();

    partidos.forEach((match) => {
      const fechaLimpia = match.date.split('T')[0];

      if (!grupos[fechaLimpia]) {
        grupos[fechaLimpia] = [];
      }

      grupos[fechaLimpia].push({
        ...match,

        homeTeam: teamsById.get(String(match.localId)),

        awayTeam: teamsById.get(String(match.visitorId)),
      });
    });

    return Object.keys(grupos)

      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

      .map((fecha) => ({
        fechaOriginal: fecha,

        partidos: grupos[fecha].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      }));
  });
  protected readonly toString = toString;
}
