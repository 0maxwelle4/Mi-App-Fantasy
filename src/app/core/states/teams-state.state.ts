import { Injectable, computed, signal } from '@angular/core';

import { TeamsInterface } from '../../shared/interfaces/teams/teams.interface';

@Injectable({
  providedIn: 'root',
})
export class TeamsState {
  private readonly _teams = signal<TeamsInterface[]>([]);

  readonly teams = this._teams.asReadonly();

  // ============================================================
  // INDEX
  // ============================================================

  readonly teamsById = computed(() => {
    const map = new Map<string, TeamsInterface>();

    for (const team of this._teams()) {
      map.set(String(team.id), team);
    }

    return map;
  });

  // ============================================================
  // SET
  // ============================================================

  setTeams(teams: TeamsInterface[]): void {
    this._teams.set(teams);
  }

  // ============================================================
  // GET TEAM
  // ============================================================

  getTeamById(teamId: string): TeamsInterface | undefined {
    return this.teamsById().get(String(teamId));
  }

  // ============================================================
  // CLEAR
  // ============================================================

  clear(): void {
    this._teams.set([]);
  }
}
