export type TournamentFormat = "league" | "knockout" | "league_knockout" | "round_robin" | "swiss";
export type TournamentStatus = "draft" | "registration" | "active" | "completed" | "cancelled";

export interface Tournament {
  id: string;
  clubId: string;
  name: string;
  description: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: number;
  endDate?: number;
  location?: string;
  bannerImageUrl?: string;
  maxTeams?: number;
  prizePool?: string;
  registrationOpen: boolean;
  registrationDeadline?: number;
  rules?: string;
  teamCount: number;
  matchCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TopPlayer {
  id: string;
  userId: string;
  name: string;
  profileImageUrl?: string;
  teamId?: string;
  teamName?: string;
  sport: string;
  statLabel: string;
  statValue: number;
}
