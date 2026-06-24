export interface Standing {
  teamId: string;
  teamName: string;
  sport: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  group?: string;
  form: string[];
  tiebreakMeta?: Record<string, number>;
  updatedAt: number;
}
