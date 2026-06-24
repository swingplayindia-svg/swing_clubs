export type MatchStatus = "scheduled" | "live" | "halftime" | "completed" | "cancelled" | "postponed";
export type KnockoutStage = "group" | "R32" | "R16" | "QF" | "SF" | "Final" | "3rd_place";

export type MatchAwardType =
  | "man_of_the_match"
  | "best_batsman"
  | "best_bowler"
  | "top_scorer"
  | "mvp"
  | "best_defender"
  | "fan_favorite";

export type HighlightType =
  | "full_match"
  | "goal"
  | "wicket"
  | "save"
  | "dunk"
  | "ace"
  | "other";

export interface MatchHighlight {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeEmbedUrl?: string;
  timestamp?: string;
  type?: HighlightType;
  createdAt: number;
}

export interface MatchAward {
  type: MatchAwardType;
  userId?: string;
  playerName: string;
  avatarUrl?: string;
  teamId?: string;
  teamName?: string;
  statLabel?: string;
  statValue?: string;
}

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
  liveStreamTitle?: string;
  scorekeeperIds?: string[];
  commentatorIds?: string[];
  rtdbPath?: string;
  notes?: string;
  recap?: string;
  attendance?: number;
  highlights?: MatchHighlight[];
  awards?: MatchAward[];
  /** Denormalized for quick iOS reads */
  manOfTheMatchName?: string;
  manOfTheMatchUserId?: string;
  manOfTheMatchAvatarUrl?: string;
  manOfTheMatchTeamName?: string;
  createdAt: number;
  updatedAt: number;
}

export const SPORT_AWARD_OPTIONS: Record<string, { type: MatchAwardType; label: string }[]> = {
  Football: [
    { type: "man_of_the_match", label: "Man of the Match" },
    { type: "top_scorer", label: "Top Scorer" },
    { type: "best_defender", label: "Best Defender" },
  ],
  Cricket: [
    { type: "man_of_the_match", label: "Player of the Match" },
    { type: "best_batsman", label: "Best Batter" },
    { type: "best_bowler", label: "Best Bowler" },
  ],
  Basketball: [
    { type: "man_of_the_match", label: "MVP" },
    { type: "top_scorer", label: "Top Scorer" },
  ],
  Badminton: [
    { type: "man_of_the_match", label: "MVP" },
    { type: "mvp", label: "Best Player" },
  ],
  Padel: [
    { type: "man_of_the_match", label: "MVP" },
    { type: "mvp", label: "Best Player" },
  ],
  Pickleball: [
    { type: "man_of_the_match", label: "MVP" },
  ],
  Tennis: [
    { type: "man_of_the_match", label: "MVP" },
  ],
  Hockey: [
    { type: "man_of_the_match", label: "Man of the Match" },
    { type: "top_scorer", label: "Top Scorer" },
  ],
};

export function awardOptionsForSport(sport: string) {
  return SPORT_AWARD_OPTIONS[sport] ?? SPORT_AWARD_OPTIONS.Football;
}
