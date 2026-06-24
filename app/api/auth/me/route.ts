import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid     = decoded.uid;

    // Check club ownership in Firestore
    const db    = getAdminDb();
    const clubs = await db.collection("clubs").where("ownerId", "==", uid).get();

    return NextResponse.json({
      uid,
      email: decoded.email,
      clubIds: clubs.docs.map((d) => d.id),
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
