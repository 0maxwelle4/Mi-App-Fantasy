import { Component, computed, inject, Signal, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiHomeService } from './services/api-home.service';
import { League } from '../../shared/interfaces/league/league.interface';
import { AppState } from '../../core/states/app-state.state';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly apiHome = inject(ApiHomeService);
  private readonly appState = inject(AppState);
  private readonly router = inject(Router);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  // ==========================================================
  // LOADING
  // ==========================================================

  readonly loadingLeagues = signal(true);

  readonly loadingFixtures = signal(true);

  // Skeletons de ligas
  readonly skeletonLeagues = Array.from({ length: 3 }, (_, index) => index);

  // Skeletons de partidos
  readonly skeletonFixtures = Array.from({ length: 4 }, (_, index) => index);

  // ==========================================================
  // MY LEAGUES
  // ==========================================================

  readonly myLeagues: Signal<League[]> = toSignal(
    this.apiHome.getUserLeagues().pipe(
      tap((leagues: League[]) => {
        if (leagues.length > 0) {
          const league = leagues[0];

          const storedLeagueId = localStorage.getItem('preSelectedLeague');

          if (!storedLeagueId) {
            this.appState.league.setPreSelectedLeague(
              league.id,
              league.name,
              league.team.id,
              league.team.money,
              league.team.teamValue,
            );
          }
        }
      }),
      finalize(() => {
        this.loadingLeagues.set(false);
      }),
    ),

    {
      initialValue: [],
    },
  );

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  navRanking(league: League): void {
    this.appState.league.setPreSelectedLeague(
      league.id,
      league.name,
      league.team.id,
      league.team.money,
      league.team.teamValue,
    );
    this.router.navigate(['/ranking', league.id]);
  }
}
