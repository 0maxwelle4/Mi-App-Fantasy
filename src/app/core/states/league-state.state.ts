import { Injectable, signal } from '@angular/core';

export interface PreSelectedLeague {
  id: string;
  name: string;
  teamId: number;
  teamMoney: number;
  teamValue: number;
}

@Injectable({
  providedIn: 'root',
})
export class LeagueState {
  private readonly _preSelectedLeague = signal<PreSelectedLeague | null>(this.getInitialLeague());

  readonly preSelectedLeague = this._preSelectedLeague.asReadonly();

  // ============================================================
  // SET LEAGUE
  // ============================================================

  setPreSelectedLeague(
    id: string,
    name: string,
    teamId: number,
    teamMoney: number,
    teamValue: number,
  ): void {
    const league: PreSelectedLeague = {
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

  updateTeamMoney(amount: number): void {
    const currentLeague = this._preSelectedLeague();

    if (!currentLeague) {
      return;
    }

    const updatedLeague: PreSelectedLeague = {
      ...currentLeague,
      teamMoney: amount,
    };

    this._preSelectedLeague.set(updatedLeague);

    this.saveLeague(updatedLeague);
  }

  // ============================================================
  // UPDATE VALUE
  // ============================================================

  updateTeamValue(amount: number): void {
    const currentLeague = this._preSelectedLeague();

    if (!currentLeague) {
      return;
    }

    const updatedLeague: PreSelectedLeague = {
      ...currentLeague,
      teamValue: amount,
    };

    this._preSelectedLeague.set(updatedLeague);

    this.saveLeague(updatedLeague);
  }

  // ============================================================
  // CLEAR
  // ============================================================

  clearPreSelectedLeague(): void {
    this._preSelectedLeague.set(null);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('preSelectedLeague');
    }
  }

  // ============================================================
  // INITIAL LEAGUE
  // ============================================================

  private getInitialLeague(): PreSelectedLeague | null {
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

  private saveLeague(league: PreSelectedLeague): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('preSelectedLeague', JSON.stringify(league));
  }
}
