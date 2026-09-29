import { PlayerImagesInterface } from './player-images.interface';
import { SquadTeamInterface } from '../squad/squad-team.interface';

export interface PlayerMasterInterface {
  images: PlayerImagesInterface;

  id: string;
  teamId: number;

  name: string;
  lastSeasonPoints: number;
  nickname: string;
  slug: string;

  positionId: number;
  position: string;

  marketValue: number;
  playerStatus: string;

  points: number;
  averagePoints: number;

  team?: SquadTeamInterface;
}
