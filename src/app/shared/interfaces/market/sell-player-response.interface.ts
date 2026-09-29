import { PlayerMasterInterface } from './player-master.interface';
import { PlayerTeamInterface } from './player-team.interface';
import { SellerTeamInterface } from './seller-team.interface';

export interface SellPlayerResponseInterface {
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

  sellerTeam: SellerTeamInterface;
}
