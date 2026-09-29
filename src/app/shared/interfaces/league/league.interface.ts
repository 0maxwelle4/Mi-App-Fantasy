import { LeagueType } from './league-type.interface';
import { LeagueConfig } from './league-config.interface';
import { Team } from './team.interface';

export interface League {
  id: string;
  access: 'private' | 'public';
  type: LeagueType;
  managersNumber: number;
  name: string;
  config: LeagueConfig;
  isDuplicated: boolean;
  isSecondRound: boolean;
  token: string;
  description: string;
  premium: boolean;
  team: Team;
}
