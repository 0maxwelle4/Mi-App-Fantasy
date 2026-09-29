import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiCalendarService = class ApiCalendarService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  getSeasonDetails() {
    return this.http.get(`${this.baseUrl}/v1/competition/${this.regionId}/seasons/last`);
  }
  getCurrentWeek() {
    return this.http.get(this.baseUrl + '/v1/competition/' + this.regionId + '/week/current');
  }
  getFixtures(numWeek) {
    return this.http.get(
      this.baseUrl + '/v1/competition/' + this.regionId + '/calendar?weekNumber=' + numWeek,
    );
  }
};
ApiCalendarService = __decorate([Service()], ApiCalendarService);
export { ApiCalendarService };
