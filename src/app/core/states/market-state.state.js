import { __decorate } from 'tslib';
import { Injectable, computed, inject, signal } from '@angular/core';
import { PlayersState } from './players-state.state';
import { findMarketPlayer } from './player-market-matcher';
let MarketState = class MarketState {
  players = inject(PlayersState);
  // ============================================================
  // MARKET TENDENCIES
  // ============================================================
  _marketTendencies = signal([]);
  marketTendencies = this._marketTendencies.asReadonly();
  // ============================================================
  // INDEX BY MARKET ID
  // ============================================================
  marketTendenciesById = computed(() => {
    const map = new Map();
    for (const market of this._marketTendencies()) {
      map.set(String(market.id), market);
    }
    return map;
  });
  // ============================================================
  // SET
  // ============================================================
  setMarketTendencies(marketTendencies) {
    this._marketTendencies.set(marketTendencies);
  }
  // ============================================================
  // GET BY MARKET ID
  // ============================================================
  getMarketTendencyById(marketId) {
    return this.marketTendenciesById().get(String(marketId));
  }
  // ============================================================
  // GET BY PLAYER ID
  // ============================================================
  getMarketTendenciesByPlayerId(playerId) {
    const player = this.players.getPlayerById(playerId);
    if (!player) {
      return undefined;
    }
    return findMarketPlayer(player, this._marketTendencies());
  }
  // ============================================================
  // CLEAR
  // ============================================================
  clear() {
    this._marketTendencies.set([]);
  }
};
MarketState = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  MarketState,
);
export { MarketState };
