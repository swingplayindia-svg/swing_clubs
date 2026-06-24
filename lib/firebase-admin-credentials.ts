export function normalizePrivateKey(raw: string): string {
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
    const end   = `-----END ${label}-----`;
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

export type FirebaseAdminEnv = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export function readFirebaseAdminEnv(): FirebaseAdminEnv | null {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const json = JSON.parse(jsonRaw) as { project_id?: string; client_email?: string; private_key?: string };
      const projectId   = json.project_id?.trim();
      const clientEmail = json.client_email?.trim();
      const privateKey  = json.private_key ? normalizePrivateKey(json.private_key) : "";
      if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
    } catch { return null; }
  }
  const projectId   = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const raw         = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !raw) return null;
  return { projectId, clientEmail, privateKey: normalizePrivateKey(raw) };
}

export function firebaseAdminConfigCode(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Firebase Admin not configured")) return "missing_env";
  if (msg.includes("private key") || msg.includes("DECODER") || msg.includes("PEM")) return "invalid_private_key";
  if (msg.includes("JSON")) return "invalid_json";
  return "init_failed";
}
