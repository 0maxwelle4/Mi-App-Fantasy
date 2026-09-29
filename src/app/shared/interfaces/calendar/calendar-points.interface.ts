export interface CalendarPointsResponse {
  formation: {
    goalkeeper: CalendarPlayer[];
    defender: CalendarPlayer[];
    midfield: CalendarPlayer[];
    striker: CalendarPlayer[];
  };
}

export interface CalendarPlayer {
  playerMaster: CalendarPlayerMaster;
  buyoutClause?: number;
  playerTeamId?: string;
  playerMarket?: {
    id: string;
    salePrice: number;
    expirationDate: string;
  };
}

export interface CalendarPlayerMaster {
  id: string;
  name: string;
  nickname?: string;
  positionId: number;
  position: string;
  teamId: number;
  points: number;
  weekPoints: number;
  averagePoints: number;
  marketValue: number;
  playerStatus: string;

  images?: {
    transparent?: {
      '256x256'?: string;
    };
  };

  lastStats: CalendarWeekStats[];
}

export interface CalendarWeekStats {
  stats: Record<string, [number, number]>;
  weekNumber: number;
  totalPoints: number;
  isInIdealFormation: boolean;
}
