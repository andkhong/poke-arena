export interface UserPublic {
  id: string;
  username: string;
  email: string;
  wins: number;
  losses: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  wins: number;
}
