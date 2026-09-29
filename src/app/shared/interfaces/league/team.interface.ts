export interface Team {
  id: number;
  money: number;
  teamPoints: number;
  playersNumber: number;
  teamValue: number;
  canPunctuate: boolean;
  position: number | null;
  isAdmin: boolean;
}
