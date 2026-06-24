import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "file and path required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storage = getAdminStorage();
    const bucket  = storage.bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
