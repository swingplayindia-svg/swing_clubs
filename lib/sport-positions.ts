export const SPORT_POSITIONS: Record<string, string[]> = {
  Football:   ["GK", "DEF", "MID", "FWD"],
  Cricket:    ["WK", "BAT", "AR", "BWL"],
  Basketball: ["PG", "SG", "SF", "PF", "C"],
  Badminton:  ["Singles", "Doubles"],
  Tennis:     ["Singles", "Doubles"],
  Hockey:     ["GK", "DEF", "MID", "FWD"],
  Padel:      ["Left", "Right"],
  Pickleball: ["Singles", "Doubles"],
};

export function positionsForSport(sport: string): string[] {
  return SPORT_POSITIONS[sport] ?? ["Player"];
}

/** Formation zones for the squad chart (row index 0 = back / defence). */
export const FORMATION_ZONES: Record<string, Record<string, { row: number; col: number }>> = {
  Football: {
    GK:  { row: 0, col: 2 },
    DEF: { row: 1, col: 2 },
    MID: { row: 2, col: 2 },
    FWD: { row: 3, col: 2 },
  },
  Cricket: {
    WK:  { row: 0, col: 1 },
    BAT: { row: 1, col: 2 },
    AR:  { row: 2, col: 1 },
    BWL: { row: 3, col: 2 },
  },
  Basketball: {
    PG: { row: 0, col: 0 },
    SG: { row: 0, col: 4 },
    SF: { row: 2, col: 1 },
    PF: { row: 2, col: 3 },
    C:  { row: 3, col: 2 },
  },
};
