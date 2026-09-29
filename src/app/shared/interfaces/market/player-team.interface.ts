import { ManagerInterface } from './manager.interface';

export interface PlayerTeamInterface {
  buyoutClause: number;
  playerTeamId: string;
  buyoutClauseLockedEndTime: string;
  isShielded: boolean;

  manager: ManagerInterface;
}
