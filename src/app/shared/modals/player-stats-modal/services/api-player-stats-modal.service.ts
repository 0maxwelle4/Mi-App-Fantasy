import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AppState } from '../../../../core/states/app-state.state';
import { PlayerStatsResponse } from '../../../interfaces/players/player-stats-modal.interface';

@Service()
export class ApiPlayerStatsModalService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  getPlayerStats(playerId: number | string) {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<PlayerStatsResponse>(
      `${this.baseUrl}/v1/competition/1/player/${playerId}/league/${leagueId}`,
    );
  }
}
