export interface ActivitiesInterface {
  activityTypeId: number;
  id: string;
  user1Id: number;
  user2Id?: number;
  playerMasterId?: number;
  amount?: number;
  weekNumber?: number;
  createdAt: string;
}
