import { __decorate } from 'tslib';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { finalize, switchMap, tap } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiCalendarService } from './services/api-calendar.service';
import { AppState } from '../../core/states/app-state.state';
let Calendar = class Calendar {
  // ==========================================================
  // SERVICES
  // ==========================================================
  appState = inject(AppState);
  apiCalendar = inject(ApiCalendarService);
  // ==========================================================
  // LOADING
  // ==========================================================
  /**
   * Loading inicial:
   * temporada + jornada actual.
   */
  loading = signal(true);
  /**
   * Loading de los partidos.
   *
   * Se activa cada vez que cambiamos de jornada.
   */
  loadingFixtures = signal(true);
  /**
   * Número de skeletons que mostramos.
   */
  skeletonFixtures = Array.from({ length: 9 }, (_, index) => index);
  // ==========================================================
  // SELECTED WEEK
  // ==========================================================
  selectedWeek = signal(1);
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
  }
  // ==========================================================
  // SEASON DETAILS
  // ==========================================================
  seasonDetails = toSignal(
    this.apiCalendar.getSeasonDetails().pipe(
      tap((fixtures) => {
        console.log('Season details:', fixtures);
      }),
      finalize(() => {
        this.loading.set(false);
      }),
    ),
    {
      initialValue: [],
    },
  );
  // ==========================================================
  // WEEKS
  // ==========================================================
  jornadasArray = computed(() => {
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
  currentWeek = toSignal(
    this.apiCalendar.getCurrentWeek().pipe(
      tap((fixtures) => {
        console.log('Current week:', fixtures);
      }),
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
  allFixtures = toSignal(
    toObservable(this.selectedWeek).pipe(
      tap(() => {
        this.loadingFixtures.set(true);
      }),
      switchMap((weekNumber) =>
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
  // GROUP FIXTURES BY DATE
  // ==========================================================
  fixturesByDate = computed(() => {
    const partidos = this.allFixtures() || [];
    const grupos = {};
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
};
Calendar = __decorate(
  [
    Component({
      selector: 'app-calendar',
      imports: [DecimalPipe, DatePipe],
      templateUrl: './calendar.html',
      styleUrl: './calendar.scss',
    }),
  ],
  Calendar,
);
export { Calendar };
