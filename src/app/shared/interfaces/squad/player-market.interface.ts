import { MarketBidInterface } from '../market/market-bid.interface';

export interface PlayerMarketInterface {
  id: string;
  salePrice: number;
  expirationDate: string;
  numberOfOffers: number;
  directOffer: boolean;
  offer?: MarketBidInterface;
}
