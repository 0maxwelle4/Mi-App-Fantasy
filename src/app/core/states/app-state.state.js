import { __decorate } from 'tslib';
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
let AppState = class AppState {
  // ============================================================
  // SERVICES
  // ============================================================
  api = inject(ApiService);
  players = inject(PlayersState);
  teams = inject(TeamsState);
  market = inject(MarketState);
  league = inject(LeagueState);
  user = inject(UserState);
  managers = inject(ManagersState);
  // ============================================================
  // LOADING
  // ============================================================
  _dataLoading = signal(false);
  dataLoading = this._dataLoading.asReadonly();
  // ============================================================
  // LOADED
  // ============================================================
  _dataLoaded = signal(false);
  dataLoaded = this._dataLoaded.asReadonly();
  // ============================================================
  // ERROR
  // ============================================================
  _dataError = signal(null);
  dataError = this._dataError.asReadonly();
  // ============================================================
  // INITIAL DATA
  // ============================================================
  loadInitialData() {
    if (this._dataLoaded()) {
      return;
    }
    if (this._dataLoading()) {
      return;
    }
    this._dataLoading.set(true);
    this._dataError.set(null);
    forkJoin({
      players: this.api.getPlayers(),
      teams: this.api.getTeams(),
      market: this.api.getMarketTrends(),
      me: this.api.getMe(),
      ranking: this.api.getLeagueRanking(),
    }).subscribe({
      next: ({ players, teams, market, me, ranking }) => {
        // ========================================================
        // PLAYERS
        // ========================================================
        this.players.setPlayers(players);
        // ========================================================
        // TEAMS
        // ========================================================
        this.teams.setTeams(teams);
        // ========================================================
        // MARKET
        // ========================================================
        const marketTendencies = parseMarketHtml(market);
        this.market.setMarketTendencies(marketTendencies);
        // ========================================================
        // USER
        // ========================================================
        this.user.setUser(me);
        // ========================================================
        // MANAGERS
        // ========================================================
        const managers = ranking.map((item) => ({
          id: String(item.team.manager.id),
          managerName: item.team.manager.managerName,
          avatar: item.team.manager.avatar,
        }));
        this.managers.setManagers(managers);
        // ========================================================
        // FIN
        // ========================================================
        this._dataLoaded.set(true);
        this._dataLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading initial data', error);
        this._dataError.set('No se han podido cargar los datos iniciales');
        this._dataLoading.set(false);
      },
    });
  }
};
AppState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  AppState,
);
export { AppState };
