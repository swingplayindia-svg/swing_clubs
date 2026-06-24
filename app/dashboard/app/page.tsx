"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseIdToken } from "@/lib/firebase-auth";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { getRtdb } from "@/lib/firebase";
import {
  Radio,
  Send,
  ImageIcon,
  CheckCircle2,
  Loader2,
  Upload,
  Trash2,
  Clock,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BroadcastMessage {
  id: string;
  text: string;
  createdAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── App Settings Page ─────────────────────────────────────────────────────────

export default function AppSettingsPage() {
  const { user } = useAuth();

  // ── Logo state ──────────────────────────────────────────────────────────────
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Broadcast state ─────────────────────────────────────────────────────────
  const [broadcastText, setBroadcastText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<BroadcastMessage[]>([]);

  // ── Load current logo ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/app/logo")
      .then((r) => r.json())
      .then((d) => setCurrentLogoUrl(d.url ?? null))
      .catch(() => {});
  }, []);

  // ── Listen to recent broadcast messages ─────────────────────────────────────
  useEffect(() => {
    const db = getRtdb();
    const q = query(
      ref(db, "conversations/swing_official/messages"),
      orderByChild("createdAt"),
      limitToLast(5),
    );
    return onValue(q, (snap) => {
      if (!snap.exists()) { setRecentMessages([]); return; }
      const msgs: BroadcastMessage[] = Object.entries(
        snap.val() as Record<string, { text: string; createdAt: number }>,
      )
        .map(([id, v]) => ({ id, text: v.text, createdAt: v.createdAt ?? 0 }))
        .sort((a, b) => b.createdAt - a.createdAt);
      setRecentMessages(msgs);
    });
  }, []);

  // ── Logo handlers ───────────────────────────────────────────────────────────
  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setLogoError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setLogoError("File must be under 5 MB."); return; }
    setLogoError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoSuccess(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const token = await getFirebaseIdToken();
      const fd = new FormData();
      fd.append("file", logoFile);
      const res = await fetch("/api/app/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCurrentLogoUrl(data.url);
      setLogoPreview(null);
      setLogoFile(null);
      setLogoSuccess(true);
      setTimeout(() => setLogoSuccess(false), 3000);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  // ── Broadcast handler ───────────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/app/broadcast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: broadcastText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBroadcastText("");
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">App Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage global Swing app branding and official broadcast messages.
        </p>
      </div>

      {/* ── Logo section ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">App Logo</h2>
            <p className="text-xs text-muted-foreground">
              Shown in the Swing broadcast channel and app header.
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Current logo preview */}
            <div className="shrink-0">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Current
              </p>
              <div className="w-20 h-20 rounded-2xl border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
                {currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Swing logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Radio className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Upload area */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {logoPreview ? "New logo" : "Upload new"}
              </p>

              {logoPreview ? (
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-primary/40 overflow-hidden shrink-0">
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <p className="text-sm text-foreground font-medium">{logoFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {logoFile ? (logoFile.size / 1024).toFixed(0) + " KB" : ""}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={uploadLogo}
                        disabled={logoUploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                      >
                        {logoUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : logoSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {logoUploading ? "Uploading…" : logoSuccess ? "Done!" : "Save logo"}
                      </button>
                      <button
                        onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleLogoDrop}
                  onClick={() => logoInputRef.current?.click()}
                  className="relative border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                >
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                  <p className="text-sm font-medium text-foreground">
                    Drop image here or{" "}
                    <span className="text-primary underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — max 5 MB</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                </div>
              )}

              {logoError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {logoError}
                </p>
              )}
              {logoSuccess && !logoPreview && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Logo updated successfully
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Broadcast section ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Swing Broadcast</h2>
            <p className="text-xs text-muted-foreground">
              Send an official message to all Swing users via the{" "}
              <code className="text-[11px] bg-muted rounded px-1 py-0.5 font-mono">
                swing_official
              </code>{" "}
              channel.
            </p>
          </div>
        </div>

        {/* Recent messages */}
        {recentMessages.length > 0 && (
          <div className="px-6 pt-4 pb-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Recent messages
            </p>
            <div className="space-y-2">
              {recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border/60"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Radio className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{msg.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.createdAt ? timeAgo(msg.createdAt) : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="p-6 space-y-3">
          <div className="relative">
            <textarea
              value={broadcastText}
              onChange={(e) => { setBroadcastText(e.target.value); setSendSuccess(false); setSendError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendBroadcast();
              }}
              placeholder="Write an official message to all users…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
            <p className="absolute bottom-3 right-3 text-[11px] text-muted-foreground tabular-nums">
              {broadcastText.length} / 500
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {sendSuccess && (
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Message sent to all users
                </span>
              )}
              {sendError && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {sendError}
                </span>
              )}
              {!sendSuccess && !sendError && (
                <span className="opacity-60">⌘ + Enter to send</span>
              )}
            </div>
            <button
              onClick={sendBroadcast}
              disabled={sending || !broadcastText.trim() || broadcastText.length > 500}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
