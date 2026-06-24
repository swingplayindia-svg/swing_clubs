import type { DocumentData, DocumentReference, Firestore } from "firebase-admin/firestore";

export function matchDocRef(
  db: Firestore,
  clubId: string,
  matchId: string,
  tournamentId?: string | null,
) {
  if (tournamentId) {
    return db
      .collection("clubs")
      .doc(clubId)
      .collection("tournaments")
      .doc(tournamentId)
      .collection("matches")
      .doc(matchId);
  }
  return db.collection("clubs").doc(clubId).collection("matches").doc(matchId);
}

export type ResolvedMatch = {
  ref: DocumentReference;
  data: DocumentData;
  tournamentId: string | null;
};

export async function resolveMatch(
  db: Firestore,
  clubId: string,
  matchId: string,
  tournamentId?: string | null,
): Promise<ResolvedMatch | null> {
  if (tournamentId) {
    const ref  = matchDocRef(db, clubId, matchId, tournamentId);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, data: snap.data()!, tournamentId };
    }
  }

  const clubRef  = matchDocRef(db, clubId, matchId);
  const clubSnap = await clubRef.get();
  if (clubSnap.exists) {
    const data = clubSnap.data()!;
    return {
      ref: clubRef,
      data,
      tournamentId: (data.tournamentId as string | undefined) ?? null,
    };
  }

  const tournaments = await db.collection("clubs").doc(clubId).collection("tournaments").get();
  for (const tournament of tournaments.docs) {
    const ref  = matchDocRef(db, clubId, matchId, tournament.id);
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, data: snap.data()!, tournamentId: tournament.id };
    }
  }

  return null;
}

export type LiveMatchSeed = {
  clubId: string;
  tournamentId: string | null;
  sport: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
};

export function normalizeMatchForLive(
  clubId: string,
  data: DocumentData,
  tournamentId: string | null,
): LiveMatchSeed {
  const homeTeamName = String(data.homeTeamName ?? data.homeTeam ?? "Home");
  const awayTeamName = String(data.awayTeamName ?? data.awayTeam ?? "Away");

  return {
    clubId:           String(data.clubId ?? clubId),
    tournamentId:     (data.tournamentId as string | undefined) ?? tournamentId,
    sport:            String(data.sport ?? data.sportType ?? "Football"),
    homeTeamId:       String(data.homeTeamId ?? data.homeTeam ?? homeTeamName),
    homeTeamName,
    awayTeamId:       String(data.awayTeamId ?? data.awayTeam ?? awayTeamName),
    awayTeamName,
  };
}

export async function assertClubMatchAccess(
  db: Firestore,
  clubId: string,
  uid: string,
): Promise<void> {
  const clubSnap = await db.collection("clubs").doc(clubId).get();
  if (!clubSnap.exists) throw new Error("Club not found");

  if (clubSnap.data()?.ownerId === uid) return;

  const memberSnap = await db.collection("clubs").doc(clubId).collection("members").doc(uid).get();
  const role = memberSnap.data()?.role as string | undefined;
  if (role && ["owner", "admin", "scorekeeper"].includes(role)) return;

  throw new Error("Forbidden");
}
