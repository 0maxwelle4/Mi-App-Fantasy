import { __decorate } from 'tslib';
import { Injectable, signal } from '@angular/core';
let LeagueState = class LeagueState {
  _preSelectedLeague = signal(this.getInitialLeague());
  preSelectedLeague = this._preSelectedLeague.asReadonly();
  // ============================================================
  // SET LEAGUE
  // ============================================================
  setPreSelectedLeague(id, name, teamId, teamMoney, teamValue) {
    const league = {
      id,
      name,
      teamId,
      teamMoney,
      teamValue,
    };
    this._preSelectedLeague.set(league);
    this.saveLeague(league);
  }
  // ============================================================
  // UPDATE MONEY
  // ============================================================
  updateTeamMoney(amount) {
    const currentLeague = this._preSelectedLeague();
    if (!currentLeague) {
      return;
    }
    const updatedLeague = {
      ...currentLeague,
      teamMoney: amount,
    };
    this._preSelectedLeague.set(updatedLeague);
    this.saveLeague(updatedLeague);
  }
  // ============================================================
  // UPDATE VALUE
  // ============================================================
  updateTeamValue(amount) {
    const currentLeague = this._preSelectedLeague();
    if (!currentLeague) {
      return;
    }
    const updatedLeague = {
      ...currentLeague,
      teamValue: amount,
    };
    this._preSelectedLeague.set(updatedLeague);
    this.saveLeague(updatedLeague);
  }
  // ============================================================
  // CLEAR
  // ============================================================
  clearPreSelectedLeague() {
    this._preSelectedLeague.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('preSelectedLeague');
    }
  }
  // ============================================================
  // INITIAL LEAGUE
  // ============================================================
  getInitialLeague() {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const league = localStorage.getItem('preSelectedLeague');
    if (!league) {
      return null;
    }
    try {
      return JSON.parse(league);
    } catch {
      return null;
    }
  }
  // ============================================================
  // SAVE
  // ============================================================
  saveLeague(league) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem('preSelectedLeague', JSON.stringify(league));
  }
};
LeagueState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  LeagueState,
);
export { LeagueState };
