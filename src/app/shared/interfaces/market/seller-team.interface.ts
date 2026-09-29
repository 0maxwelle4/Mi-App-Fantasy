import { ManagerInterface } from './manager.interface';

export interface SellerTeamInterface {
  teamMoney: number | null;

  id: string;
  managerId: number;

  teamValue: number;
  teamPoints: number;

  manager: ManagerInterface;
}
