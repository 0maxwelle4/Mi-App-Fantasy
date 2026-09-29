import { computed, inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { SquadInterface } from '../../../shared/interfaces/squad/squad.interface';
import { SellPlayerResponseInterface } from '../../../shared/interfaces/market/sell-player-response.interface';
import { AppState } from '../../../core/states/app-state.state';
import { MarketBidInterface } from '../../../shared/interfaces/market/market-bid.interface';

@Service()
export class ApiSquadService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  /**
  getOwnLineup(teamId: string): Observable<OwnLineupInterface> {
    return this.http.get<OwnLineupInterface>(this.baseUrl + '/v1/competition/1/teams/' + teamId + '/lineup');
  }
    */

  /** GET **/
  getSquad(teamId: string): Observable<SquadInterface> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<SquadInterface>(
      this.baseUrl + '/v1/competition/1/leagues/' + leagueId + '/teams/' + teamId,
    );
  }

  /** POST **/
  buyoutClause(clauseToPay: number, playerId: string) {
    const leagueId = this.preSelectedLeagueId();

    const body = {
      buyoutClauseToPay: clauseToPay,
    };

    return this.http.post(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/buyout/${playerId}/pay`,
      body,
    );
  }

  addToMarket(playerId: string, salePrice: number): Observable<SellPlayerResponseInterface> {
    const leagueId = this.preSelectedLeagueId();

    const body = {
      playerId: String(playerId),
      salePrice: Number(salePrice),
    };

    const params = new HttpParams().set('x-lang', 'es');

    return this.http.post<SellPlayerResponseInterface>(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/sell`,
      body,
      { params },
    );
  }

  makeDirectOffer(playerId: string, money: number): Observable<MarketBidInterface> {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: money,
      playerId: playerId,
    };

    return this.http.post<MarketBidInterface>(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/direct-offer`,
      body,
    );
  }

  /** PUT **/
  modifyDirectOffer(offerId: string, marketId: string, amount: number) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: amount,
    };

    return this.http.put(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${marketId}/offer/${offerId}`,
      body,
    );
  }

  raiseReleaseClause(playerId: string, valueToIncrease: number) {
    const leagueId = this.preSelectedLeagueId();
    const realValueToIncrease = valueToIncrease * 2;
    const body = {
      factor: 2,
      playerId: playerId,
      valueToIncrease: realValueToIncrease,
    };

    return this.http.put(`${this.baseUrl}/v1/competition/1/league/${leagueId}/buyout/player`, body);
  }

  /** DELETE **/
  removeFromMarket(marketId: string): Observable<Object> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.delete(
      `${this.baseUrl}/v1/competition/1/league/` + leagueId + `/market/` + marketId + `/delete`,
    );
  }

  cancelDirectOffer(offerId: string, marketId: string) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.delete(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${marketId}/offer/${offerId}/cancel`,
    );
  }
}
