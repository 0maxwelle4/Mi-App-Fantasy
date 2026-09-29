import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ApiService } from '../services/api.service';

import { PlayersState } from './players-state.state';
import { TeamsState } from './teams-state.state';
import { MarketState } from './market-state.state';
import { LeagueState } from './league-state.state';
import { UserState } from './user-state.state';
import { ManagersState } from './managers-state.state';

import { parseMarketHtml } from './market-parser';
import { ManagerInterface } from '../../shared/interfaces/squad/manager.interface';

@Injectable({
  providedIn: 'root',
})
export class AppState {
  // ============================================================
  // SERVICES
  // ============================================================

  private readonly api = inject(ApiService);

  readonly players = inject(PlayersState);

  readonly teams = inject(TeamsState);

  readonly market = inject(MarketState);

  readonly league = inject(LeagueState);

  readonly user = inject(UserState);

  readonly managers = inject(ManagersState);

  // ============================================================
  // LOADING
  // ============================================================

  private readonly _dataLoading = signal(false);

  readonly dataLoading = this._dataLoading.asReadonly();

  // ============================================================
  // LOADED
  // ============================================================

  private readonly _dataLoaded = signal(false);

  readonly dataLoaded = this._dataLoaded.asReadonly();

  // ============================================================
  // ERROR
  // ============================================================

  private readonly _dataError = signal<string | null>(null);

  readonly dataError = this._dataError.asReadonly();

  // ============================================================
  // INITIAL DATA
  // ============================================================

  loadInitialData(): void {
    if (this._dataLoaded() || this._dataLoading()) {
      return;
    }

    this._dataLoading.set(true);
    this._dataError.set(null);

    const leagueId = this.league.preSelectedLeague()?.id;

    if (!leagueId) {
      this._dataError.set('No hay ninguna liga seleccionada');

      this._dataLoading.set(false);

      return;
    }

    // ============================================================
    // 1. GET ME
    // ============================================================

    this.api.getMe().subscribe({
      next: (user) => {
        this.user.setUser(user);
        console.log(user);

        // ========================================================
        // 2. RESTO DE DATOS
        // ========================================================

        forkJoin({
          players: this.api.getPlayers(),

          teams: this.api.getTeams(),

          market: this.api.getMarketTrends(),

          ranking: this.api.getLeagueRanking(leagueId),
        }).subscribe({
          next: ({ players, teams, market, ranking }) => {
            this.players.setPlayers(players);

            this.teams.setTeams(teams);

            this.market.setMarketTendencies(parseMarketHtml(market));

            const managers: ManagerInterface[] = ranking
              .filter((item) => !!item.team?.manager)
              .map((item) => ({
                id: String(item.team.manager.id),
                managerName: item.team.manager.managerName,
                avatar: item.team.manager.avatar,
                teamId: String(item.team.id),
              }))
              .filter(
                (manager, index, array) => array.findIndex((m) => m.id === manager.id) === index,
              );

            this.managers.setManagers(managers);

            this._dataLoaded.set(true);

            this._dataLoading.set(false);
          },

          error: (error) => {
            console.error('❌ Error loading initial data', error);

            this._dataError.set('No se han podido cargar los datos iniciales');

            this._dataLoading.set(false);
          },
        });
      },

      error: (error) => {
        console.error('❌ Error loading user', error);

        this._dataError.set('No se ha podido cargar el usuario');

        this._dataLoading.set(false);
      },
    });
  }

  // ============================================================
  // REFRESH DATA
  // ============================================================
  refreshData(): void {
    this._dataLoaded.set(false);
    this.loadInitialData();
  }

}
