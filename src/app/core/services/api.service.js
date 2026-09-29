import { __decorate } from 'tslib';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
let ApiService = class ApiService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  analytics = environment.analytics;
  // ============================================================
  // USER
  // ============================================================
  getMe() {
    return this.http.get(`${this.baseUrl}/v4/user/me`);
  }
  // ============================================================
  // LEAGUE RANKING
  // ============================================================
  getLeagueRanking(competitionId, leagueId) {
    return this.http.get(
      `${this.baseUrl}/v1/competition/${competitionId}/leagues/${leagueId}/standing`,
    );
  }
  // ============================================================
  // TEAMS
  // ============================================================
  getTeams(competitionId) {
    return this.http.get(`${this.baseUrl}/v3/teams-master`);
  }
  // ============================================================
  // PLAYERS
  // ============================================================
  getPlayers(competitionId) {
    return this.http.get(`${this.baseUrl}/v1/competition/${competitionId}/players`);
  }
  // ============================================================
  // MARKET
  // ============================================================
  getMarketTrends() {
    return this.http.get(`${this.analytics}/laliga-fantasy/mercado`, {
      responseType: 'text',
    });
  }
};
ApiService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  ApiService,
);
export { ApiService };
