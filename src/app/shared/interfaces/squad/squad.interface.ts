import { ManagerInterface } from './manager.interface';
import { SquadPlayerInterface } from './squad-player.interface';
import { MarketBidInterface } from '../market/market-bid.interface';

export interface SquadPlayerMarketInterface {
  id: string;
  salePrice?: number;
  expirationDate: string;
  numberOfOffers: number;
  directOffer: boolean;
  offer?: MarketBidInterface;
}

export interface SquadInterface {
  players: SquadPlayerInterface[];
  loanedPlayers: SquadPlayerInterface[];
  teamMoney: number;
  playersNumber: number;
  id: string;
  managerId: number;
  startingWeek: string;
  banned: boolean;
  teamValue: number;
  teamPoints: number;
  manager: ManagerInterface;
  playerMarket?: SquadPlayerMarketInterface;
}
