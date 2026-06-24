import type { Firestore } from "firebase-admin/firestore";
import type { LiveLineupPlayer, MatchLineups, TeamLineup } from "@/lib/schemas/live-lineup";
import { defaultFormationKey, formationSlots } from "@/lib/live-formations";

type TeamDoc = {
  id: string;
  name: string;
  players?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    jerseyNumber?: number;
    position?: string;
  }[];
  captainId?: string;
};

async function fetchTeam(
  db: Firestore,
  clubId: string,
  teamId: string,
  tournamentId: string | null,
): Promise<TeamDoc | null> {
  const ref = tournamentId
    ? db.collection("clubs").doc(clubId).collection("tournaments").doc(tournamentId).collection("teams").doc(teamId)
    : db.collection("clubs").doc(clubId).collection("teams").doc(teamId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as TeamDoc;
}

function toLineupPlayer(p: TeamDoc["players"] extends (infer U)[] | undefined ? U : never): LiveLineupPlayer {
  return {
    userId: p.userId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    jerseyNumber: p.jerseyNumber,
    position: p.position,
  };
}

function seedTeamLineup(team: TeamDoc, sport: string): TeamLineup {
  const formation = defaultFormationKey(sport);
  const slots = formationSlots(sport, formation);
  const players = (team.players ?? []).map(toLineupPlayer);
  const onField: LiveLineupPlayer[] = [];
  const bench: LiveLineupPlayer[] = [];

  players.forEach((p, i) => {
    if (i < slots.length) {
      onField.push({ ...p, slotIndex: i, position: p.position ?? slots[i]?.role });
    } else {
      bench.push(p);
    }
  });

  return {
    teamId: team.id,
    teamName: team.name,
    formation,
    onField,
    bench,
    updatedAt: Date.now(),
  };
}

export async function buildInitialLineups(
  db: Firestore,
  clubId: string,
  sport: string,
  homeTeamId: string,
  homeTeamName: string,
  awayTeamId: string,
  awayTeamName: string,
  tournamentId: string | null,
): Promise<MatchLineups> {
  const [homeTeam, awayTeam] = await Promise.all([
    fetchTeam(db, clubId, homeTeamId, tournamentId),
    fetchTeam(db, clubId, awayTeamId, tournamentId),
  ]);

  const now = Date.now();
  const empty = (id: string, name: string): TeamLineup => ({
    teamId: id,
    teamName: name,
    formation: defaultFormationKey(sport),
    onField: [],
    bench: [],
    updatedAt: now,
  });

  return {
    home: homeTeam ? seedTeamLineup(homeTeam, sport) : empty(homeTeamId, homeTeamName),
    away: awayTeam ? seedTeamLineup(awayTeam, sport) : empty(awayTeamId, awayTeamName),
  };
}
