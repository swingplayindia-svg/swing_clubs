import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ADMIN_ROLES = ["owner", "admin", "scorekeeper", "commentator"];

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid     = decoded.uid;
    const db      = getAdminDb();

    // Clubs owned by the user
    const ownedSnap = await db.collection("clubs").where("ownerId", "==", uid).get();
    const ownedIds  = new Set(ownedSnap.docs.map((d) => d.id));

    // Clubs where the user is a member with an elevated role
    const memberSnap = await db.collectionGroup("members").where("userId", "==", uid).get();
    const managedIds = memberSnap.docs
      .filter((d) => ADMIN_ROLES.includes(d.data().role))
      .map((d) => d.ref.parent.parent!.id);

    const clubIds = Array.from(new Set([...ownedIds, ...managedIds]));

    return NextResponse.json({ uid, email: decoded.email, clubIds });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
