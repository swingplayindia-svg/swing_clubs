export interface TeamPlayer {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  jerseyNumber?: number;
  position?: string;
}

export interface Team {
  id: string;
  clubId: string;
  tournamentId?: string;
  name: string;
  sport: string;
  captainId?: string;
  captainName?: string;
  captainAvatarUrl?: string;
  logoUrl?: string;
  players: TeamPlayer[];
  memberCount: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  updatedAt: number;
}
