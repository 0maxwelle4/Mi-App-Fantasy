import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, of, startWith, switchMap, tap } from 'rxjs';

import { ApiRankingService, BudgetEstimate } from './services/api-ranking.service';
import { AppState } from '../../core/states/app-state.state';

@Component({
  selector: 'app-ranking',
  imports: [DecimalPipe],
  templateUrl: './ranking.html',
  styleUrl: './ranking.scss',
})
export class Ranking {
  // ==========================================================
  // DEPENDENCIES
  // ==========================================================

  private readonly router = inject(Router);
  private readonly apiRanking = inject(ApiRankingService);
  private readonly appState = inject(AppState);

  // ==========================================================
  // LOADING / REFRESH
  // ==========================================================

  readonly loading = signal(true);
  readonly budgetsLoading = signal(true);

  readonly skeletonRows = Array.from({ length: 8 }, (_, index) => index);

  private readonly refresh$ = new Subject<void>();

  refresh(): void {
    if (this.loading() || this.budgetsLoading()) return;

    this.refresh$.next();
  }

  // ==========================================================
  // LEAGUE
  // ==========================================================

  readonly preSelectedLeagueName = computed(() => this.appState.league.preSelectedLeague()?.name);

  // ==========================================================
  // PRESUPUESTOS ESTIMADOS
  // ==========================================================
  // Se declaran ANTES de leagueStanding porque éste los dispara.

  private readonly budgetRequest$ = new Subject<string[]>();

  readonly budgets = toSignal(
    this.budgetRequest$.pipe(
      switchMap((teamIds) => {
        this.budgetsLoading.set(true);

        return this.apiRanking.getBudgetEstimates(teamIds).pipe(
          catchError((error) => {
            console.error('Error calculando presupuestos estimados:', error);
            return of(new Map<string, BudgetEstimate>());
          }),
          finalize(() => this.budgetsLoading.set(false)),
        );
      }),
    ),
    { initialValue: new Map<string, BudgetEstimate>() },
  );

  // ==========================================================
  // RANKING
  // ==========================================================

  readonly leagueStanding = toSignal(
    this.refresh$.pipe(
      startWith(undefined),
      switchMap(() => {
        this.loading.set(true);

        return this.apiRanking.getLeagueRanking().pipe(
          catchError((error) => {
            console.error('Error al cargar la clasificación:', error);
            this.loading.set(false);
            this.budgetsLoading.set(false);
            return EMPTY;
          }),
        );
      }),
      tap((standing) => {
        this.loading.set(false);

        // Cuando ya tenemos la clasificación, calculamos los presupuestos
        this.budgetRequest$.next(standing.map((position) => String(position.team.id)));
      }),
    ),
    { initialValue: [] },
  );

  // ==========================================================
  // HELPERS
  // ==========================================================

  getBudgetTooltip(estimate: BudgetEstimate): string {
    if (estimate.isExact) {
      return 'Dinero real de tu equipo';
    }

    const money = (value: number) => new Intl.NumberFormat('es-ES').format(Math.round(value)) + '€';

    return [
      'Inicial: 100.000.000€',
      `+ Ventas a la liga: ${money(estimate.leagueSales)}`,
      `+ Ventas a managers: ${money(estimate.managerSales)}`,
      `+ Premios: ${money(estimate.bonuses)}`,
      `− Fichajes de mercado: ${money(estimate.marketSpent)}`,
      `− Compras a managers: ${money(estimate.managerPurchases)}`,
      `− Cláusulas subidas: ${money(estimate.clauseSpent)}`,
    ].join('\n');
  }

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  goToTeamSquad(lineupId: string): void {
    this.router.navigate(['squad', lineupId]);
  }
}
