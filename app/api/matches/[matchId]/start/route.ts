import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminRtdb } from "@/lib/firebase-admin";
import {
  assertClubMatchAccess,
  normalizeMatchForLive,
  resolveMatch,
} from "@/lib/server/matches";
import { buildInitialLineups } from "@/lib/server/lineup-seed";

type StartMatchBody = {
  clubId: string;
  tournamentId?: string | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const { matchId } = await params;
    const body = await req.json() as StartMatchBody;

    if (!body.clubId) {
      return NextResponse.json({ error: "Missing clubId" }, { status: 400 });
    }

    const db   = getAdminDb();
    const rtdb = getAdminRtdb();

    await assertClubMatchAccess(db, body.clubId, decoded.uid);

    const resolved = await resolveMatch(db, body.clubId, matchId, body.tournamentId);
    if (!resolved) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const live = normalizeMatchForLive(body.clubId, resolved.data, resolved.tournamentId);
    if (!live.homeTeamName || !live.awayTeamName) {
      return NextResponse.json({ error: "Match is missing team information" }, { status: 400 });
    }

    const now = Date.now();
    await resolved.ref.update({ status: "live", updatedAt: now });

    const lineups = await buildInitialLineups(
      db,
      live.clubId,
      live.sport,
      live.homeTeamId,
      live.homeTeamName,
      live.awayTeamId,
      live.awayTeamName,
      live.tournamentId,
    );

    await rtdb.ref(`liveMatches/${matchId}/meta`).set({
      status:           "live",
      sport:            live.sport,
      homeTeamId:       live.homeTeamId,
      homeTeamName:     live.homeTeamName,
      awayTeamId:       live.awayTeamId,
      awayTeamName:     live.awayTeamName,
      homeScore:        0,
      awayScore:        0,
      period:           "pre",
      clock:            0,
      scorekeeperUid:   decoded.uid,
      scorekeeperName:  decoded.name ?? decoded.email ?? null,
      clubId:           live.clubId,
      tournamentId:     live.tournamentId,
      firestoreMatchId: matchId,
      sportMeta:        {},
      startedAt:        now,
      updatedAt:        now,
    });

    await rtdb.ref(`liveMatches/${matchId}/lineups`).set(lineups);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "Club not found" || message === "Match not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Start match failed:", err);
    return NextResponse.json({ error: "Failed to start match" }, { status: 500 });
  }
}
