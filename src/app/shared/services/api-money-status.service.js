import { __decorate } from 'tslib';
import { computed, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppState } from '../../core/states/app-state.state';
let ApiMoneyStatusService = class ApiMoneyStatusService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  getTeamMoney(teamsId) {
    const url = `${this.baseUrl}/v1/competition/${this.regionId}/teams/${teamsId}/money`;
    return this.http.get(url).pipe(
      tap((money) => {
        const netMoney = money.teamMoney - money.teamInvestment;
        this.appState.league.updateTeamMoney(netMoney);
      }),
    );
  }
};
ApiMoneyStatusService = __decorate(
  [
    Injectable({
      providedIn: 'root', // Hace que el servicio esté disponible en toda la aplicación
    }),
  ],
  ApiMoneyStatusService,
);
export { ApiMoneyStatusService };
