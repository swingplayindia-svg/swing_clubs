export type LiveMatchStatus = "scheduled" | "live" | "halftime" | "paused" | "completed" | "cancelled";

export type LiveEventType =
  | "goal" | "own_goal" | "penalty_goal" | "penalty_miss"
  | "yellow_card" | "red_card" | "substitution"
  | "wicket" | "run" | "wide" | "no_ball" | "bye" | "leg_bye" | "over_complete"
  | "point" | "game" | "set"
  | "two_points" | "three_points" | "free_throw" | "foul" | "timeout"
  | "halftime" | "fulltime" | "milestone"
  | "custom";

export interface LiveMatchMeta {
  status: LiveMatchStatus;
  sport: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: number;
  scorekeeperUid: string | null;
  scorekeeperName: string | null;
  clubId: string;
  tournamentId: string | null;
  firestoreMatchId: string;
  startedAt: number;
  updatedAt: number;
  sportMeta: CricketMeta | FootballMeta | PadelMeta | BasketballMeta | BadmintonMeta | Record<string, unknown>;
}

export interface CricketMeta {
  currentOver: number;
  currentBall: number;
  totalOvers: number;
  wickets: number;
  extras: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  target?: number;
  innings: 1 | 2;
}

export interface FootballMeta {
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  halfDuration: number;
}

export interface PadelMeta {
  sets: [number, number][];
  currentSet: number;
  gamesHome: number;
  gamesAway: number;
  pointsHome: number;
  pointsAway: number;
  tiebreak: boolean;
  advantages: "home" | "away" | null;
}

export interface BasketballMeta {
  quarter: number;
  foulsHome: number;
  foulsAway: number;
  timeoutsHome: number;
  timeoutsAway: number;
}

export interface BadmintonMeta {
  sets: [number, number][];
  currentSet: number;
  pointsHome: number;
  pointsAway: number;
}

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  timestamp: number;
  teamId: "home" | "away" | "neutral";
  teamName: string;
  playerId?: string;
  playerName?: string;
  description: string;
  value?: number;
  period: string;
  undone: boolean;
  meta: Record<string, unknown>;
}

export interface CommentaryEntry {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "scorekeeper" | "commentator" | "system" | "auto";
  type: "manual" | "auto" | "milestone";
  text: string;
  period: string;
  visibility: "public" | "internal";
  linkedEventId?: string;
  pinned: boolean;
  highlighted: boolean;
  createdAt: number;
}

export interface PresenceEntry {
  name: string;
  role: string;
  connectedAt: number;
}

export interface LiveMatchData {
  meta: LiveMatchMeta;
  events: Record<string, LiveEvent>;
  commentary: Record<string, CommentaryEntry>;
  presence: Record<string, PresenceEntry>;
}
