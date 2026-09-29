import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { League } from '../../../shared/interfaces/league/league.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiHomeService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.baseUrl;

  getUserLeagues(): Observable<League[]> {
    return this.http.get<League[]>(`${this.baseUrl}/v1/competition/1/leagues`);
  }
}
