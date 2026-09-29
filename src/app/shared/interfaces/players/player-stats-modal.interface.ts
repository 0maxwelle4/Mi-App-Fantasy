export interface PlayerStatValue {
  value: number;
  points: number;
}

export interface PlayerWeek {
  stats: Record<string, [number, number] | number[]>;
  weekNumber: number;
  totalPoints: number;
  isInIdealFormation: boolean;
}

export interface PlayerMaster {
  playerStats: PlayerWeek[];

  points: number;
  weekPoints: number;
  averagePoints: number;

  images?: {
    transparent?: {
      '256x256'?: string;
    };
  };

  id: string;
  teamId: number;

  name: string;
  nickname?: string;
  slug?: string;

  lastSeasonPoints?: number;

  positionId: number;
  position: string;

  marketValue: number;

  playerStatus?: string;
}

export interface PlayerStatsResponse {
  playerMaster: PlayerMaster;

  marketPlayer?: {
    discr?: string;
    id?: string;
    salePrice?: number;
    expirationDate?: string;
    numberOfOffers?: number;
    directOffer?: boolean;
  };

  manager?: {
    id?: string;
    managerName?: string;
    avatar?: string;
  };

  playerTeam?: {
    buyoutClause?: number;
    playerTeamId?: string;
    buyoutClauseLockedEndTime?: string;
    isShielded?: boolean;

    manager?: {
      id?: string;
      managerName?: string;
      avatar?: string;
    };
  };
}

export interface FormattedStat {
  key: string;
  label: string;
  value: number;
  points: number;
}
