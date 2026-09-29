import { __decorate } from 'tslib';
import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../../core/states/app-state.state';
let ApiHomeService = class ApiHomeService {
  http = inject(HttpClient);
  baseUrl = environment.baseUrl;
  appState = inject(AppState);
  userRegionId = computed(() => this.appState.user.user()?.id);
  regionId = this.userRegionId();
  constructor() {}
  // Obtener todas las ligas del usuario autenticado
  getUserLeagues() {
    return this.http.get(`${this.baseUrl}/v1/competition/${this.regionId}/leagues`);
  }
};
ApiHomeService = __decorate([Service()], ApiHomeService);
export { ApiHomeService };
