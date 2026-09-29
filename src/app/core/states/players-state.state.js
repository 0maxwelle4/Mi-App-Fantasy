import { __decorate } from 'tslib';
import { Injectable, computed, signal } from '@angular/core';
let PlayersState = class PlayersState {
  _players = signal([]);
  players = this._players.asReadonly();
  // ============================================================
  // INDEX
  // ============================================================
  playersById = computed(() => {
    const map = new Map();
    for (const player of this._players()) {
      map.set(String(player.id), player);
    }
    return map;
  });
  // ============================================================
  // SET
  // ============================================================
  setPlayers(players) {
    this._players.set(players);
  }
  // ============================================================
  // GET PLAYER
  // ============================================================
  getPlayerById(playerId) {
    return this.playersById().get(String(playerId));
  }
  // ============================================================
  // GET PLAYERS BY TEAM
  // ============================================================
  getPlayersByTeam(teamId) {
    return this._players().filter((player) => String(player.teamId) === String(teamId));
  }
  // ============================================================
  // CLEAR
  // ============================================================
  clear() {
    this._players.set([]);
  }
};
PlayersState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  PlayersState,
);
export { PlayersState };
