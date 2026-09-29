export interface PlayerMarketTendenciesInterface {
  playerId: string;
  futbolFantasyId: string;

  playerName: string;

  difference24h: number;
  differencePct24h: number;

  value1d: number;
  value2d: number;
  value3d: number;
  value7d: number;
  value14d: number;
  value30d: number;

  trend: number;
  acceleration: number;
}
