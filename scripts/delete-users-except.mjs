/**
 * Deletes all documents in the `users` collection EXCEPT the specified IDs.
 *
 *   DRY_RUN=true  node --experimental-vm-modules scripts/delete-users-except.mjs
 *   DRY_RUN=false node --experimental-vm-modules scripts/delete-users-except.mjs
 *
 * Default is DRY_RUN=true (safe preview).
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── IDs to keep ───────────────────────────────────────────────────────────────

const KEEP_IDS = new Set([
  "PIaCtA4UuCVAXnlKvdvrSbYq68A3",
  "A3pMa166w0Z11tdR7m0zQe8cf8e2",
  "EKinCxIjs6W2UicG0l5ScbNLivS2",
  "ZkHF72aGlwMi8gtfu3FPqDeqj2G2",
]);

const DRY_RUN = process.env.DRY_RUN !== "false"; // safe by default

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Normalize private key (same logic as firebase-admin-credentials.ts) ──────

function normalizePrivateKey(raw) {
  let key = raw.trim();
  for (let i = 0; i < 2; i++) {
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
  }
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");
  if (key.includes("-----BEGIN") && !key.includes("\n")) {
    const m = key.match(/-----BEGIN ([^-]+)-----/);
    const label = m?.[1] ?? "PRIVATE KEY";
    const begin = `-----BEGIN ${label}-----`;
    const end = `-----END ${label}-----`;
    const s = key.indexOf(begin);
    const e = key.indexOf(end);
    if (s >= 0 && e > s) {
      const body = key.slice(s + begin.length, e).replace(/\s+/g, "");
      const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
      key = `${begin}\n${wrapped}\n${end}`;
    }
  }
  return key;
}

// ── Firebase Admin init ───────────────────────────────────────────────────────

function initAdmin() {
  const name = "delete-script";
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  }

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey: normalizePrivateKey(rawKey) }) },
    name
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const app = initAdmin();
  const db = getFirestore(app);

  console.log(DRY_RUN ? "🔍  DRY RUN — nothing will be deleted\n" : "🗑   LIVE RUN — deleting documents\n");
  console.log(`Keeping ${KEEP_IDS.size} doc(s):\n  ${[...KEEP_IDS].join("\n  ")}\n`);

  const snapshot = await db.collection("users").get();
  const toDelete = snapshot.docs.filter((d) => !KEEP_IDS.has(d.id));

  console.log(`Total users : ${snapshot.size}`);
  console.log(`To delete   : ${toDelete.length}`);
  console.log(`To keep     : ${snapshot.size - toDelete.length}\n`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (DRY_RUN) {
    console.log("Would delete:");
    for (const doc of toDelete) {
      const d = doc.data();
      console.log(`  ${doc.id}  •  ${d.email ?? "(no email)"}  •  ${d.name ?? "(no name)"}`);
    }
    console.log("\nRe-run with  DRY_RUN=false  to actually delete.");
    return;
  }

  // Batch-delete in chunks of 500
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 500) {
    const batch = db.batch();
    for (const doc of toDelete.slice(i, i + 500)) batch.delete(doc.ref);
    await batch.commit();
    deleted += Math.min(500, toDelete.length - i);
    process.stdout.write(`  Deleted ${deleted}/${toDelete.length}...\r`);
  }

  console.log(`\n✅  Done. Deleted ${deleted} document(s).`);
}

run().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
