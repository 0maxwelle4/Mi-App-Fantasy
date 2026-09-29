import { Injectable, computed, inject, signal } from '@angular/core';
import { PlayersState } from './players-state.state';
import { findMarketPlayer } from './player-market-matcher';

export interface MarketTendencyInterface {
  id: string;

  name: string;

  position: string;

  team: string;

  marketValue: number;

  value1d: number;
  value2d: number;
  value3d: number;
  value7d: number;
  value14d: number;
  value30d: number;

  difference24h: number;
  difference2d: number;
  difference3d: number;
  difference7d: number;
  difference14d: number;
  difference30d: number;

  differencePct24h: number;
  differencePct2d: number;
  differencePct3d: number;
  differencePct7d: number;
  differencePct14d: number;
  differencePct30d: number;

  trend: number;

  acceleration: number;
}

@Injectable({
  providedIn: 'root',
})
export class MarketState {
  private readonly players = inject(PlayersState);

  // ============================================================
  // MARKET TENDENCIES
  // ============================================================

  private readonly _marketTendencies = signal<MarketTendencyInterface[]>([]);

  readonly marketTendencies = this._marketTendencies.asReadonly();

  // ============================================================
  // INDEX BY MARKET ID
  // ============================================================

  readonly marketTendenciesById = computed(() => {
    const map = new Map<string, MarketTendencyInterface>();

    for (const market of this._marketTendencies()) {
      map.set(String(market.id), market);
    }

    return map;
  });

  // ============================================================
  // SET
  // ============================================================

  setMarketTendencies(marketTendencies: MarketTendencyInterface[]): void {
    this._marketTendencies.set(marketTendencies);
  }

  // ============================================================
  // GET BY MARKET ID
  // ============================================================

  getMarketTendencyById(marketId: string): MarketTendencyInterface | undefined {
    return this.marketTendenciesById().get(String(marketId));
  }

  // ============================================================
  // GET BY PLAYER ID
  // ============================================================

  getMarketTendenciesByPlayerId(playerId: string): MarketTendencyInterface | undefined {
    const player = this.players.getPlayerById(playerId);

    if (!player) {
      return undefined;
    }

    return findMarketPlayer(player, this._marketTendencies());
  }

  // ============================================================
  // CLEAR
  // ============================================================

  clear(): void {
    this._marketTendencies.set([]);
  }
}
