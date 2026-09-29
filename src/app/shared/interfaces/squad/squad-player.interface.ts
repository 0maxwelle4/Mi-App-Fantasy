import { ManagerInterface } from './manager.interface';
import { PlayerMasterInterface } from './player-master.interface';
import { PlayerMarketInterface } from './player-market.interface';

export interface SquadPlayerInterface {
  playerMarket?: PlayerMarketInterface;
  buyoutClause: number;
  managerId: number;
  playerTeamId: string;
  buyoutClauseLockedEndTime: string;
  isShielded: boolean;
  manager: ManagerInterface;
  playerMaster: PlayerMasterInterface;
  bid?: any;
}
