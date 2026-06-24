import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminRtdb } from "@/lib/firebase-admin";
import { ServerValue } from "firebase-admin/database";

const CONV_ID = "swing_official";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await getAdminAuth().verifyIdToken(token);

    const { text } = (await req.json()) as { text?: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const rtdb = getAdminRtdb();
    const msgRef = rtdb.ref(`conversations/${CONV_ID}/messages`).push();
    const messageId = msgRef.key!;

    const payload = {
      type: "text",
      text: text.trim(),
      senderId: "swing_official",
      createdAt: ServerValue.TIMESTAMP,
    };

    await rtdb.ref().update({
      [`conversations/${CONV_ID}/messages/${messageId}`]: payload,
      [`conversations/${CONV_ID}/lastMessage`]: {
        text: text.trim(),
        senderId: "swing_official",
        createdAt: ServerValue.TIMESTAMP,
      },
    });

    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    console.error("[broadcast] error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
