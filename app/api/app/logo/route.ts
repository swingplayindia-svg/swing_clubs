import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminBucket, getAdminDb } from "@/lib/firebase-admin";

const STORAGE_PATH = "app/swing-logo";
const FIRESTORE_DOC = { col: "app-config", doc: "global" };

export async function GET(_req: NextRequest) {
  try {
    const snap = await getAdminDb()
      .collection(FIRESTORE_DOC.col)
      .doc(FIRESTORE_DOC.doc)
      .get();
    return NextResponse.json({ url: snap.data()?.swingLogoUrl ?? null });
  } catch {
    return NextResponse.json({ url: null });
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await getAdminAuth().verifyIdToken(token);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const bucket = getAdminBucket();
    const fileRef = bucket.file(STORAGE_PATH);

    await fileRef.save(buffer, { metadata: { contentType: file.type } });
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${STORAGE_PATH}?t=${Date.now()}`;

    await getAdminDb()
      .collection(FIRESTORE_DOC.col)
      .doc(FIRESTORE_DOC.doc)
      .set({ swingLogoUrl: url, updatedAt: Date.now() }, { merge: true });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[logo] upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
