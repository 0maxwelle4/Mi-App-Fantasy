import { Manager } from './manager.interface';

export interface Team {
  managerWarned: boolean;
  id: string;
  managerId: number;
  banned: boolean;
  teamValue: number;
  teamPoints: number;
  manager: Manager;
  teamMoney: any;
  isAdmin: boolean;
}
