import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiSquadService = class ApiSquadService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  /**
    getOwnLineup(teamId: string): Observable<OwnLineupInterface> {
      return this.http.get<OwnLineupInterface>(this.baseUrl + '/v1/competition/1/teams/' + teamId + '/lineup');
    }
      */
  /** GET **/
  getSquad(teamId) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      this.baseUrl +
        '/v1/competition/' +
        this.regionId +
        '/leagues/' +
        leagueId +
        '/teams/' +
        teamId,
    );
  }
  /** POST **/
  addToMarket(playerId, salePrice) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      playerId: String(playerId),
      salePrice: Number(salePrice),
    };
    const params = new HttpParams().set('x-lang', 'es');
    return this.http.post(`${this.baseUrl}/v1/competition/1/league/${leagueId}/market/sell`, body, {
      params,
    });
  }
  /** DELETE **/
  removeFromMarket(marketId) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.delete(
      `${this.baseUrl}/v1/competition/` +
        this.regionId +
        `/league/` +
        leagueId +
        `/market/` +
        marketId +
        `/delete`,
    );
  }
};
ApiSquadService = __decorate([Service()], ApiSquadService);
export { ApiSquadService };
