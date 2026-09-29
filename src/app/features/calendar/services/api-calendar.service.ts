import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CalendarInterface } from '../../../shared/interfaces/calendar/calendar.interface';
import { CurrentWeekInterface } from '../../../shared/interfaces/calendar/current-week.interface';
import { WeekStatsInterface } from '../../../shared/interfaces/calendar/week-stats.interface';

@Injectable({ providedIn: 'root' })
export class ApiCalendarService {
  private http: HttpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly statsBaseUrl = environment.statsBaseUrl;

  getSeasonDetails(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/competition/1/seasons/last`);
  }

  getCurrentWeek(): Observable<CurrentWeekInterface> {
    return this.http.get<CurrentWeekInterface>(this.baseUrl + '/v1/competition/1/week/current');
  }

  getFixtures(numWeek: number): Observable<CalendarInterface[]> {
    return this.http.get<CalendarInterface[]>(
      this.baseUrl + '/v1/competition/1/calendar?weekNumber=' + numWeek,
    );
  }

  getWeekStats(numWeek: number): Observable<WeekStatsInterface[]> {
    return this.http.get<WeekStatsInterface[]>(
      this.statsBaseUrl + '/stats/v1/competition/1/stats/week/' + numWeek,
    );
  }
}
