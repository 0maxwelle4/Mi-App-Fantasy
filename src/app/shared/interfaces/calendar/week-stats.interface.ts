export interface PlayerStatInterface {
  id: number;
  images: {
    transparent: {
      '256x256': string;
    };
  };
  name: string;
  nickname: string;
  positionId: number; // 1 portero, 2 defensa, 3 centrocampista, 4 delantero, 5 entrenador
  teamId: number;
  weekPoints: number;
}

export interface TeamStatsInterface {
  id: number;
  badgeColor: string;
  mainName: string;
  players: PlayerStatInterface[];
}

export interface WeekStatsInterface {
  id: number;
  date: string;
  local: TeamStatsInterface;
  visitor: TeamStatsInterface;
  matchState: number;
  localScore: number;
  visitorScore: number;
}
