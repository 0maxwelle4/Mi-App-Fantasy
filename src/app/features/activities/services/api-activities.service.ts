import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ActivitiesInterface } from '../../../shared/interfaces/league/activities.interface';
import { AppState } from '../../../core/states/app-state.state';

@Service()
export class ApiActivitiesService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly appState = inject(AppState);

  readonly preSelectedLeagueId = computed(() => this.appState.league.preSelectedLeague()?.id);

  getLeagueActivities(numActivity: number): Observable<ActivitiesInterface[]> {
    const leagueId = this.preSelectedLeagueId();
    return this.http.get<ActivitiesInterface[]>(
      `${this.baseUrl}/v1/competition/1/leagues/${leagueId}/activity/${numActivity}`,
    );
  }
}
