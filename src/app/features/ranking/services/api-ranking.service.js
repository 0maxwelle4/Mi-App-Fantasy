import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiRankingService = class ApiRankingService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  // Obtener el ranking
  getLeagueRanking() {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/` + this.regionId + `/leagues/` + leagueId + `/standing`,
    );
  }
};
ApiRankingService = __decorate([Service()], ApiRankingService);
export { ApiRankingService };
