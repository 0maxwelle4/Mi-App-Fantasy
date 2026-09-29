import { PlayerImagesInterface } from './player-images.interface';
import { SquadTeamInterface } from './squad-team.interface';

export interface PlayerMasterInterface {
  id: string;
  name: string;
  nickname: string;
  slug: string;
  positionId: number;
  playerStatus: string;
  lastSeasonPoints: number | null;
  images: PlayerImagesInterface;
  team: SquadTeamInterface;
  lastStats: unknown[];
  averagePoints: number;
  points: number;
  marketValue: number;
  teamId?: number;
}
