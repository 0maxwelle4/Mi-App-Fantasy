import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

import { TeamsInterface } from '../../shared/interfaces/teams/teams.interface';
import { PlayerInterface } from '../../shared/interfaces/players/player.interface';
import { RankingInterface } from '../../shared/interfaces/ranking/ranking.interface';
import { UserInterface } from '../../shared/interfaces/users/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.baseUrl;
  private readonly analytics = environment.analytics;

  // ============================================================
  // USER
  // ============================================================

  getMe(): Observable<UserInterface> {
    return this.http.get<UserInterface>(`${this.baseUrl}/v4/user/me`);
  }

  // ============================================================
  // RANKING
  // ============================================================

  getLeagueRanking(leagueId: string): Observable<RankingInterface[]> {
    return this.http.get<RankingInterface[]>(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/standing`,
    );
  }

  // ============================================================
  // TEAMS
  // ============================================================

  getTeams(): Observable<TeamsInterface[]> {
    return this.http.get<TeamsInterface[]>(`${this.baseUrl}/v3/teams-master`);
  }

  // ============================================================
  // PLAYERS
  // ============================================================

  getPlayers(): Observable<PlayerInterface[]> {
    return this.http.get<PlayerInterface[]>(`${this.baseUrl}/v1/competition/1/players`);
  }

  // ============================================================
  // MARKET
  // ============================================================

  getMarketTrends(): Observable<string> {
    return this.http.get(`${this.analytics}/laliga-fantasy/mercado`, {
      responseType: 'text',
    });
  }
}
