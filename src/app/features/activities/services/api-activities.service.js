import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiActivitiesService = class ApiActivitiesService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);
  getLeagueActivities(numActivity) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/activity/${numActivity}`,
    );
  }
};
ApiActivitiesService = __decorate([Service()], ApiActivitiesService);
export { ApiActivitiesService };
