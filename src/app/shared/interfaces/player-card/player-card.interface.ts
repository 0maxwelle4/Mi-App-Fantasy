import { PlayerMasterInterface } from '../market/player-master.interface';

export type PlayerCardContext = 'squad' | 'market';

export interface PlayerCardInterface {
  player: PlayerMasterInterface;

  context: PlayerCardContext;

  // Squad
  buyoutClause?: number;
  isShielded?: boolean;
  buyoutClauseLockedEndTime?: string;

  // Market
  salePrice?: number;
  expirationDate?: string;
  numberOfOffers?: number;
  directOffer?: boolean;
}
