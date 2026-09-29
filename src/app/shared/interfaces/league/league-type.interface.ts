import { PrizeInformation } from './prize-information.interface';

export interface LeagueType {
  id: string;
  canBeDuplicated: boolean;
  sponsorId: number;
  prizeInformation: PrizeInformation;
}
