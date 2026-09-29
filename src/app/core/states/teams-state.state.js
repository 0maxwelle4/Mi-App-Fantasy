import { __decorate } from 'tslib';
import { Injectable, computed, signal } from '@angular/core';
let TeamsState = class TeamsState {
  _teams = signal([]);
  teams = this._teams.asReadonly();
  // ============================================================
  // INDEX
  // ============================================================
  teamsById = computed(() => {
    const map = new Map();
    for (const team of this._teams()) {
      map.set(String(team.id), team);
    }
    return map;
  });
  // ============================================================
  // SET
  // ============================================================
  setTeams(teams) {
    this._teams.set(teams);
  }
  // ============================================================
  // GET TEAM
  // ============================================================
  getTeamById(teamId) {
    return this.teamsById().get(String(teamId));
  }
  // ============================================================
  // CLEAR
  // ============================================================
  clear() {
    this._teams.set([]);
  }
};
TeamsState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  TeamsState,
);
export { TeamsState };
