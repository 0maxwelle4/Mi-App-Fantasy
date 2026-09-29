export interface MarketBidBuyerTeamInterface {
  id: string;
  managerId: number;
  teamMoney: number;
  teamValue: number;
  teamPoints: number;
}

export interface MarketBidInterface {
  id: string;
  money: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | string;
  createdAt: string;
  updatedAt: string;
  expirationDate?: string;
  isFromMarket?: boolean;
  buyerTeam?: MarketBidBuyerTeamInterface;
}
