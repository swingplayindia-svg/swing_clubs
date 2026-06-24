export interface LiveLineupPlayer {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  jerseyNumber?: number;
  position?: string;
  /** Index into formation slots (0-based). */
  slotIndex?: number;
}

export interface TeamLineup {
  teamId: string;
  teamName: string;
  formation: string;
  onField: LiveLineupPlayer[];
  bench: LiveLineupPlayer[];
  updatedAt: number;
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
}
