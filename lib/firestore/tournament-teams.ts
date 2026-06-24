"use client";

import { doc, setDoc, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { stripUndefined } from "@/lib/firestore/sanitize";
import { updateTournament } from "@/lib/firestore/tournaments";
import { deleteTeam } from "@/lib/firestore/teams";
import type { Team } from "@/lib/schemas/team";

/** Copy a club team into a tournament roster (same doc id for cross-reference). */
export async function addClubTeamToTournament(
  clubId: string,
  tournamentId: string,
  clubTeam: Team,
): Promise<void> {
  const ref = doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "teams", clubTeam.id);
  const payload = stripUndefined({
    ...clubTeam,
    clubId,
    tournamentId,
    updatedAt: Date.now(),
  } as Record<string, unknown>);
  await setDoc(ref, payload);
}

export async function removeTeamFromTournament(
  clubId: string,
  tournamentId: string,
  teamId: string,
): Promise<void> {
  await deleteTeam(clubId, teamId, tournamentId);
}

export async function syncTournamentTeamCount(
  clubId: string,
  tournamentId: string,
  count: number,
): Promise<void> {
  await updateTournament(clubId, tournamentId, { teamCount: count });
}

export async function addMultipleTeamsToTournament(
  clubId: string,
  tournamentId: string,
  clubTeams: Team[],
): Promise<void> {
  const batch = writeBatch(getDb());
  const now = Date.now();

  for (const clubTeam of clubTeams) {
    const ref = doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "teams", clubTeam.id);
    const payload = stripUndefined({
      ...clubTeam,
      clubId,
      tournamentId,
      updatedAt: now,
    } as Record<string, unknown>);
    batch.set(ref, payload);
  }

  await batch.commit();
}
