import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminRtdb } from "@/lib/firebase-admin";
import { matchDocRef } from "@/lib/server/matches";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await getAdminAuth().verifyIdToken(token);
    const { matchId } = await params;
    const body = await req.json() as { clubId: string; tournamentId?: string | null; homeScore: number; awayScore: number };

    const db   = getAdminDb();
    const rtdb = getAdminRtdb();

    // Get final score from RTDB if not provided
    let { homeScore, awayScore } = body;
    if (homeScore === undefined) {
      const snap = await rtdb.ref(`liveMatches/${matchId}/meta`).get();
      if (snap.exists()) {
        const meta = snap.val();
        homeScore = meta.homeScore ?? 0;
        awayScore = meta.awayScore ?? 0;
      }
    }

    // Update Firestore match
    await matchDocRef(db, body.clubId, matchId, body.tournamentId).update({
      status:    "completed",
      homeScore,
      awayScore,
      updatedAt: Date.now(),
    });

    // Mark RTDB as completed
    await rtdb.ref(`liveMatches/${matchId}/meta`).update({ status: "completed", updatedAt: Date.now() });

    return NextResponse.json({ ok: true, homeScore, awayScore });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
