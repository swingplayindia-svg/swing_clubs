"use client";

import {
  collection, doc, getDocs, onSnapshot,
  orderBy, query, setDoc, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Standing } from "@/lib/schemas/standing";

function standingsRef(clubId: string, tournamentId?: string) {
  if (tournamentId) return collection(getDb(), "clubs", clubId, "tournaments", tournamentId, "standings");
  return collection(getDb(), "clubs", clubId, "standings");
}

export async function getStandings(clubId: string, tournamentId?: string): Promise<Standing[]> {
  const snap = await getDocs(query(standingsRef(clubId, tournamentId), orderBy("position", "asc")));
  return snap.docs.map((d) => ({ ...d.data() } as Standing));
}

export function subscribeStandings(clubId: string, cb: (standings: Standing[]) => void, tournamentId?: string): Unsubscribe {
  return onSnapshot(query(standingsRef(clubId, tournamentId), orderBy("position", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data() } as Standing)));
  });
}

export async function upsertStanding(clubId: string, standing: Standing, tournamentId?: string): Promise<void> {
  const ref = tournamentId
    ? doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "standings", standing.teamId)
    : doc(getDb(), "clubs", clubId, "standings", standing.teamId);
  await setDoc(ref, { ...standing, updatedAt: Date.now() }, { merge: true });
}

export function recalculateStandingsFromMatches(
  teams: { id: string; name: string; sport: string }[],
  matches: { homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number; status: string }[],
  sport: string,
): Standing[] {
  const completed = matches.filter((m) => m.status === "completed");
  const map = new Map<string, Standing>();

  teams.forEach((t, i) => {
    map.set(t.id, {
      teamId: t.id, teamName: t.name, sport,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, position: i + 1, form: [], updatedAt: Date.now(),
    });
  });

  completed.forEach((m) => {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) return;

    home.played++; away.played++;
    home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3; home.form.push("W");
      away.lost++;                  away.form.push("L");
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3; away.form.push("W");
      home.lost++;                  home.form.push("L");
    } else {
      home.drawn++; home.points += 1; home.form.push("D");
      away.drawn++; away.points += 1; away.form.push("D");
    }
  });

  return Array.from(map.values())
    .map((s) => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst, form: s.form.slice(-5) }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .map((s, i) => ({ ...s, position: i + 1 }));
}
