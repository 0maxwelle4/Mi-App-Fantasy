import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { MarketPlayerInterface } from '../../../shared/interfaces/market/market-player.interface';
import { AppState } from '../../../core/states/app-state.state';

@Service()
export class ApiMarketService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  getLeagueMarket(): Observable<MarketPlayerInterface[]> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<MarketPlayerInterface[]>(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market`,
    );
  }

  makeBidMarket(playerMarketId: string, money: number) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: money,
    };

    return this.http.post(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${playerMarketId}/bid`,
      body,
    );
  }

  modifyBidMarket(playerMarketId: string, money: number, bidId: string) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: money,
    };

    return this.http.put(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${playerMarketId}/bid/${bidId}`,
      body,
    );
  }

  cancelBidMarket(playerMarketId: string, bidId: string) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.delete(
      `${this.baseUrl}/v1/competition/1/league/${leagueId}/market/${playerMarketId}/bid/${bidId}/cancel`,
    );
  }
}
