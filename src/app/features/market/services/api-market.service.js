import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiMarketService = class ApiMarketService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  getLeagueMarket() {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market`,
    );
  }
  makeBidMarket(playerMarketId, money) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: money,
    };
    return this.http.post(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market/${playerMarketId}/bid`,
      body,
    );
  }
  modifyBidMarket(playerMarketId, money, bidId) {
    const leagueId = this.preSelectedLeagueId();
    const body = {
      money: money,
    };
    return this.http.put(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market/${playerMarketId}/bid/${bidId}`,
      body,
    );
  }
  cancelBidMarket(playerMarketId, bidId) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.delete(
      `${this.baseUrl}/v1/competition/${this.regionId}/league/${leagueId}/market/${playerMarketId}/bid/${bidId}/cancel`,
    );
  }
};
ApiMarketService = __decorate([Service()], ApiMarketService);
export { ApiMarketService };
