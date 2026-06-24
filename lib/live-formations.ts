/** Pitch slot as percentage coordinates (x: left→right, y: own goal→opponent). */
export interface FormationSlot {
  role: string;
  x: number;
  y: number;
}

export interface FormationPreset {
  label: string;
  slots: FormationSlot[];
}

const football = (label: string, rows: number[][]): FormationPreset => ({
  label,
  slots: rows.flatMap((row, rowIdx) => {
    const y = 12 + rowIdx * 22;
    const count = row.length;
    return row.map((_, colIdx) => ({
      role: rowIdx === 0 ? "GK" : rowIdx === rows.length - 1 ? "FWD" : rowIdx === 1 ? "DEF" : "MID",
      x: count === 1 ? 50 : 15 + (colIdx * 70) / (count - 1),
      y,
    }));
  }),
});

export const FOOTBALL_FORMATIONS: Record<string, FormationPreset> = {
  "4-4-2": football("4-4-2", [[1], [4], [4], [2]]),
  "4-3-3": football("4-3-3", [[1], [4], [3], [3]]),
  "3-5-2": football("3-5-2", [[1], [3], [5], [2]]),
  "4-2-3-1": football("4-2-3-1", [[1], [4], [2], [3], [1]]),
  "5-3-2": football("5-3-2", [[1], [5], [3], [2]]),
};

export const BASKETBALL_FORMATION: FormationPreset = {
  label: "Starting 5",
  slots: [
    { role: "PG", x: 20, y: 25 },
    { role: "SG", x: 80, y: 25 },
    { role: "SF", x: 25, y: 55 },
    { role: "PF", x: 75, y: 55 },
    { role: "C",  x: 50, y: 80 },
  ],
};

export const CRICKET_FORMATION: FormationPreset = {
  label: "Playing XI",
  slots: Array.from({ length: 11 }, (_, i) => ({
    role: i === 0 ? "WK" : i < 6 ? "BAT" : "BWL",
    x: 10 + (i % 4) * 26,
    y: 15 + Math.floor(i / 4) * 28,
  })),
};

export const PADEL_FORMATION: FormationPreset = {
  label: "Doubles",
  slots: [
    { role: "Left",  x: 35, y: 40 },
    { role: "Right", x: 65, y: 40 },
  ],
};

export const BADMINTON_FORMATION: FormationPreset = {
  label: "Singles",
  slots: [{ role: "Singles", x: 50, y: 50 }],
};

export const BADMINTON_DOUBLES: FormationPreset = {
  label: "Doubles",
  slots: [
    { role: "Doubles", x: 35, y: 45 },
    { role: "Doubles", x: 65, y: 45 },
  ],
};

export function formationsForSport(sport: string): Record<string, FormationPreset> {
  const s = sport.toLowerCase();
  if (s === "football" || s === "soccer" || s === "hockey") return FOOTBALL_FORMATIONS;
  if (s === "basketball") return { default: BASKETBALL_FORMATION };
  if (s === "cricket") return { default: CRICKET_FORMATION };
  if (s === "padel" || s === "pickleball") return { default: PADEL_FORMATION };
  if (s === "badminton") return { singles: BADMINTON_FORMATION, doubles: BADMINTON_DOUBLES };
  return { default: { label: "Lineup", slots: Array.from({ length: 7 }, (_, i) => ({ role: "Player", x: 15 + (i % 4) * 23, y: 20 + Math.floor(i / 4) * 35 })) } };
}

export function defaultFormationKey(sport: string): string {
  const forms = formationsForSport(sport);
  if (sport.toLowerCase() === "football" || sport.toLowerCase() === "soccer") return "4-3-3";
  return Object.keys(forms)[0] ?? "default";
}

export function formationSlots(sport: string, formationKey: string): FormationSlot[] {
  const forms = formationsForSport(sport);
  return forms[formationKey]?.slots ?? forms[Object.keys(forms)[0]]?.slots ?? [];
}
