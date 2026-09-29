import { computed, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppState } from '../../core/states/app-state.state';

export interface MoneyResponseInterface {
  teamMoney: number;
  teamInvestment: number;
}

@Injectable({
  providedIn: 'root', // Hace que el servicio esté disponible en toda la aplicación
})
export class ApiMoneyStatusService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  getTeamMoney(teamsId: number): Observable<MoneyResponseInterface> {
    const url = `${this.baseUrl}/v1/competition/1/teams/${teamsId}/money`;

    return this.http.get<MoneyResponseInterface>(url).pipe(
      tap((money) => {
        const netMoney = money.teamMoney - money.teamInvestment;
        this.appState.league.updateTeamMoney(netMoney);
      }),
    );
  }
}
