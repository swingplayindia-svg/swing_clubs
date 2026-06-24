export const CLUB_SPORTS = [
  "Football", "Cricket", "Padel", "Pickleball",
  "Basketball", "Badminton", "Tennis", "Hockey",
] as const;

export type ClubSport = (typeof CLUB_SPORTS)[number];

const SPORT_LOOKUP = Object.fromEntries(
  CLUB_SPORTS.map((s) => [s.toLowerCase(), s]),
) as Record<string, ClubSport>;

export function normalizeSport(raw: string): ClubSport | null {
  const key = raw.trim().toLowerCase();
  return SPORT_LOOKUP[key] ?? null;
}
