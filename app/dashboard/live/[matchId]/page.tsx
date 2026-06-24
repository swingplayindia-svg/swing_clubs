"use client";

import { use, useEffect, useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMatch, useMatchClock } from "@/hooks/use-live-match";
import { addCommentaryEntry } from "@/lib/rtdb/commentary";
import { joinPresence } from "@/lib/rtdb/presence";
import { endMatch, undoLastEvent, halfTimeMatch, resumeMatch } from "@/lib/rtdb/live-match";
import { updateMatch } from "@/lib/firestore/matches";
import { formatMatchClock, sportEmoji } from "@/lib/utils";
import {
  Radio, Play, Pause, SkipForward, Square, RotateCcw,
  MessageSquare, List, Send, Pin, ChevronDown, Users, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { FootballPanel }  from "@/components/live/scoring-panels/football-panel";
import { CricketPanel }   from "@/components/live/scoring-panels/cricket-panel";
import { PadelPanel }     from "@/components/live/scoring-panels/padel-panel";
import { BasketballPanel }from "@/components/live/scoring-panels/basketball-panel";
import { BadmintonPanel } from "@/components/live/scoring-panels/badminton-panel";

type Tab = "commentary" | "events";

export default function LiveControlRoomPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId }  = use(params);
  const { user }     = useAuth();
  const {
    meta, events, commentary, presence, isConnected,
    addCommentary, undoEvent, end, halfTime, resume, claim, release,
  } = useLiveMatch(matchId);
  const clock     = useMatchClock(meta);
  const [tab,     setTab]     = useState<Tab>("commentary");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);

  // Join presence
  useEffect(() => {
    if (!user || !matchId) return;
    const leave = joinPresence(matchId, user.uid, { name: user.displayName, role: "organizer" });
    return leave;
  }, [matchId, user]);

  // Claim scorekeeper
  useEffect(() => {
    if (!user || !meta || claimed) return;
    claim(user.uid, user.displayName).then(setClaimed).catch(() => {});
  }, [meta?.status, user]);

  // Keyboard shortcuts
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    // shortcuts are sport-specific; handled inside panels
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const sendComment = async () => {
    if (!comment.trim() || !user) return;
    setSending(true);
    try {
      await addCommentaryEntry(matchId, {
        authorId: user.uid, authorName: user.displayName,
        authorRole: "commentator", type: "manual",
        text: comment.trim(), period: meta?.period ?? "match",
        visibility: "public", pinned: false, highlighted: false,
        createdAt: Date.now(),
      });
      setComment("");
    } finally {
      setSending(false);
    }
  };

  const handleEndMatch = async () => {
    if (!endConfirm) { setEndConfirm(true); setTimeout(() => setEndConfirm(false), 4000); return; }
    try {
      await end();
      if (meta?.clubId && meta?.firestoreMatchId) {
        await updateMatch(meta.clubId, meta.firestoreMatchId, {
          status: "completed",
          homeScore: meta.homeScore,
          awayScore: meta.awayScore,
        }, meta.tournamentId ?? undefined);
      }
      toast.success("Match ended. Scores saved to Firestore.");
    } catch { toast.error("Failed to end match."); }
  };

  if (!meta && isConnected) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Match not found in real-time database.</p>
    </div>
  );

  const statusColor = meta?.status === "live" ? "text-primary" : meta?.status === "halftime" ? "text-chart-4" : "text-muted-foreground";
  const presenceList = Object.values(presence ?? {});

  const ScoringPanel = () => {
    if (!meta) return null;
    const sport = meta.sport?.toLowerCase() ?? "";
    const props = { matchId, meta, authorId: user?.uid ?? "", authorName: user?.displayName ?? "" };
    if (sport === "football" || sport === "soccer")          return <FootballPanel {...props} />;
    if (sport === "cricket")                                 return <CricketPanel {...props} />;
    if (sport === "padel")                                   return <PadelPanel {...props} />;
    if (sport === "basketball")                              return <BasketballPanel {...props} />;
    if (sport === "badminton" || sport === "pickleball")     return <BadmintonPanel {...props} sport={meta.sport} />;
    return <div className="text-center text-muted-foreground py-8">No scoring panel for sport: {meta.sport}</div>;
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden z-50">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-primary ${meta?.status === "live" ? "live-dot" : "opacity-30"}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>
            {meta?.status ?? "connecting…"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{meta?.sport && `${sportEmoji(meta.sport)} ${meta.sport}`}</span>
        </div>
        <div className="flex-1" />
        {/* Connection + presence */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs ${isConnected ? "text-win" : "text-muted-foreground"}`}>
            <Wifi className="w-3.5 h-3.5" />
            {isConnected ? "Live" : "Connecting…"}
          </div>
          {presenceList.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {presenceList.length} online
            </div>
          )}
        </div>
        <a href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition px-2">← Dashboard</a>
      </header>

      {/* Main 3-column grid */}
      <div className="flex-1 grid grid-cols-[280px_1fr_300px] overflow-hidden">

        {/* ── LEFT: Match meta + status controls ── */}
        <aside className="border-r border-border bg-card/50 overflow-y-auto flex flex-col">
          {/* Scoreboard */}
          <div className="p-5 border-b border-border">
            {/* Teams + score */}
            <div className="space-y-3 mb-5">
              {(["home", "away"] as const).map((team) => (
                <div key={team} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {team === "home" ? meta?.homeTeamName : meta?.awayTeamName}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{team}</p>
                  </div>
                  <span className="text-4xl font-black text-foreground score-digits tabular-nums">
                    {team === "home" ? (meta?.homeScore ?? 0) : (meta?.awayScore ?? 0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Clock */}
            <div className="text-center">
              <p className="text-3xl font-black text-primary score-digits">{formatMatchClock(clock)}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{meta?.period?.replace(/_/g, " ") ?? "—"}</p>
            </div>
          </div>

          {/* Match controls */}
          <div className="p-4 border-b border-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Match Controls</p>
            {meta?.status === "live" && (
              <>
                <button onClick={() => halfTime()} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition">
                  <Pause className="w-3.5 h-3.5" /> Half Time
                </button>
                <button onClick={() => resume("second_half")} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition">
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              </>
            )}
            {meta?.status === "halftime" && (
              <button onClick={() => resume("second_half")} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-win/15 text-win border border-win/25 text-xs font-semibold hover:bg-win/25 transition">
                <Play className="w-3.5 h-3.5" /> Start 2nd Half
              </button>
            )}
            <button onClick={() => undoEvent()} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition">
              <RotateCcw className="w-3.5 h-3.5" /> Undo Last Event
            </button>
            <button
              onClick={handleEndMatch}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition ${
                endConfirm
                  ? "bg-loss text-white border-loss animate-pulse"
                  : "border-loss/40 text-loss hover:bg-loss/10"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              {endConfirm ? "Confirm End Match" : "End Match"}
            </button>
          </div>

          {/* Presence */}
          {presenceList.length > 0 && (
            <div className="p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Online Now</p>
              <div className="space-y-1.5">
                {presenceList.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-win shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER: Sport-specific scoring panel ── */}
        <main className="overflow-y-auto p-6 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {meta?.sport && `${sportEmoji(meta.sport)} `}Scoring Panel
            </p>
            <ScoringPanel />
          </div>
        </main>

        {/* ── RIGHT: Commentary + event log ── */}
        <aside className="border-l border-border bg-card/50 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {([["commentary", MessageSquare, "Commentary"], ["events", List, "Events"]] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setTab(id as Tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition ${
                  tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tab === "commentary" ? (
              commentary.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Commentary appears here as events happen.</div>
              ) : (
                commentary.map((entry) => (
                  <div key={entry.id} className={`rounded-lg p-2.5 text-xs ${entry.highlighted ? "bg-primary/10 border border-primary/20" : entry.pinned ? "bg-muted/60 border border-border" : "bg-muted/30"}`}>
                    <div className="flex items-start gap-1.5">
                      {entry.pinned && <Pin className="w-2.5 h-2.5 text-primary shrink-0 mt-0.5" />}
                      {entry.highlighted && <span className="text-primary font-bold shrink-0">★</span>}
                      <p className="text-foreground leading-relaxed flex-1">{entry.text}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <span className="text-muted-foreground">{entry.period}</span>
                      <span className="text-muted-foreground">· {entry.authorName}</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              events.filter((e) => !e.undone).map((event) => (
                <div key={event.id} className="rounded-lg bg-muted/30 p-2.5 text-xs">
                  <p className="font-medium text-foreground">{event.description}</p>
                  <p className="text-muted-foreground mt-0.5">{event.period} · {event.teamName}</p>
                </div>
              ))
            )}
          </div>

          {/* Commentary input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                placeholder="Add commentary… (Enter to send)"
                rows={2}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <button
                onClick={sendComment}
                disabled={sending || !comment.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick phrases */}
            <div className="flex flex-wrap gap-1 mt-2">
              {["GOAL! 🎯", "WICKET! 🏏", "What a save!", "Great play!", "VAR check"].map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => setComment(phrase)}
                  className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] hover:bg-accent hover:text-foreground transition"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
