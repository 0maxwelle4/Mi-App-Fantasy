import { Team } from './team.interface';

export interface RankingInterface {
  position: number;
  previousPosition: number;
  points: number;
  livePoints?: number;
  team: Team;
}
