import { __decorate } from 'tslib';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiRankingService } from './services/api-ranking.service';
import { AppState } from '../../core/states/app-state.state';
let Ranking = class Ranking {
  // ==========================================================
  // DEPENDENCIES
  // ==========================================================
  router = inject(Router);
  apiRanking = inject(ApiRankingService);
  appState = inject(AppState);
  // ==========================================================
  // LOADING
  // ==========================================================
  loading = signal(true);
  /**
   * Número de filas que queremos mostrar
   * mientras se carga la clasificación.
   */
  skeletonRows = Array.from({ length: 8 }, (_, index) => index);
  // ==========================================================
  // LEAGUE
  // ==========================================================
  preSelectedLeagueName = computed(() => this.appState.league.preSelectedLeague()?.name);
  // ==========================================================
  // RANKING
  // ==========================================================
  leagueStanding = toSignal(
    this.apiRanking.getLeagueRanking().pipe(
      finalize(() => {
        this.loading.set(false);
      }),
    ),
    {
      initialValue: [],
    },
  );
  // ==========================================================
  // NAVIGATION
  // ==========================================================
  goToTeamSquad(lineupId) {
    this.router.navigate(['squad', lineupId]);
  }
};
Ranking = __decorate(
  [
    Component({
      selector: 'app-ranking',
      imports: [DecimalPipe],
      templateUrl: './ranking.html',
      styleUrl: './ranking.scss',
    }),
  ],
  Ranking,
);
export { Ranking };
