import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

interface TeamInput { id: string; name: string; sport: string; }

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await getAdminAuth().verifyIdToken(token);
    const body = await req.json() as { clubId: string; tournamentId: string; teams: TeamInput[]; startDate: number; format: string };
    const { clubId, tournamentId, teams, startDate } = body;

    if (teams.length < 2) return NextResponse.json({ error: "Need at least 2 teams" }, { status: 400 });

    const db      = getAdminDb();
    const pairs: [TeamInput, TeamInput][] = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairs.push([teams[i], teams[j]]);
      }
    }

    const batch = db.batch();
    pairs.forEach((pair, idx) => {
      const ref = db.collection("clubs").doc(clubId)
        .collection("tournaments").doc(tournamentId)
        .collection("matches").doc();
      batch.set(ref, {
        clubId, tournamentId,
        homeTeamId:   pair[0].id,
        homeTeamName: pair[0].name,
        awayTeamId:   pair[1].id,
        awayTeamName: pair[1].name,
        homeScore: 0, awayScore: 0,
        status: "scheduled",
        sport: pair[0].sport,
        matchDate: startDate + idx * 86_400_000,
        isKnockout: false,
        round: Math.floor(idx / Math.ceil(teams.length / 2)) + 1,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    });
    await batch.commit();

    return NextResponse.json({ ok: true, count: pairs.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
