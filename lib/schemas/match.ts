export type MatchStatus = "scheduled" | "live" | "halftime" | "completed" | "cancelled" | "postponed";
export type KnockoutStage = "group" | "R32" | "R16" | "QF" | "SF" | "Final" | "3rd_place";

export interface Match {
  id: string;
  clubId: string;
  tournamentId?: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  sport: string;
  matchDate: number;
  venue?: string;
  stage?: string;
  round?: number;
  isKnockout: boolean;
  knockoutStage?: KnockoutStage;
  streamUrl?: string;
  youtubeBroadcastId?: string;
  youtubeEmbedUrl?: string;
  scorekeeperIds?: string[];
  commentatorIds?: string[];
  rtdbPath?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
