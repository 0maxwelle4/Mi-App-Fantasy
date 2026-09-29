import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { CurrentWeekInterface } from '../../../shared/interfaces/calendar/current-week.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CalendarPointsResponse } from '../../../shared/interfaces/calendar/calendar-points.interface';

@Service()
export class ApiCalendarPointsService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getCurrentWeek(): Observable<CurrentWeekInterface> {
    return this.http.get<CurrentWeekInterface>(this.baseUrl + '/v1/competition/1/week/current');
  }

  getCalendarPoints(teamId: number, weekNumber: number) {
    return this.http.get<CalendarPointsResponse>(
      this.baseUrl + `/v1/competition/1/teams/${teamId}/lineup/week/${weekNumber}`,
    );
  }
}
