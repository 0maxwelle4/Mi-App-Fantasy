import { PlayerMasterInterface } from './player-master.interface';
import { PlayerTeamInterface } from './player-team.interface';
import { SellerTeamInterface } from './seller-team.interface';
import { MarketBidInterface } from './market-bid.interface';

export interface MarketPlayerInterface {
  discr: string;

  playerMaster: PlayerMasterInterface;
  playerTeam: PlayerTeamInterface;

  id: string;
  salePrice: number;
  expirationDate: string;
  status: string;
  leagueType: string;
  leagueId: number;
  numberOfOffers: number;
  directOffer: boolean;
  numberOfBids: number;

  bid?: MarketBidInterface;
  sellerTeam?: SellerTeamInterface;
}
