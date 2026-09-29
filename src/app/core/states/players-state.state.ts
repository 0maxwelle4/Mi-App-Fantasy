import { Injectable, computed, signal } from '@angular/core';

import { PlayerInterface } from '../../shared/interfaces/players/player.interface';

@Injectable({
  providedIn: 'root',
})
export class PlayersState {
  private readonly _players = signal<PlayerInterface[]>([]);

  readonly players = this._players.asReadonly();

  // ============================================================
  // INDEX
  // ============================================================

  readonly playersById = computed(() => {
    const map = new Map<string, PlayerInterface>();

    for (const player of this._players()) {
      map.set(String(player.id), player);
    }

    return map;
  });

  // ============================================================
  // SET
  // ============================================================

  setPlayers(players: PlayerInterface[]): void {
    this._players.set(players);
  }

  // ============================================================
  // GET PLAYER
  // ============================================================

  getPlayerById(playerId: string): PlayerInterface | undefined {
    return this.playersById().get(String(playerId));
  }

  // ============================================================
  // GET PLAYERS BY TEAM
  // ============================================================

  getPlayersByTeam(teamId: string): PlayerInterface[] {
    return this._players().filter((player) => String(player.teamId) === String(teamId));
  }

  // ============================================================
  // CLEAR
  // ============================================================

  clear(): void {
    this._players.set([]);
  }
}
