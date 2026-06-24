"use client";

import { use, useEffect, useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMatch, useMatchClock } from "@/hooks/use-live-match";
import { useLiveLineups } from "@/hooks/use-live-lineups";
import { useMatch } from "@/hooks/use-club-data";
import { addCommentaryEntry } from "@/lib/rtdb/commentary";
import { joinPresence } from "@/lib/rtdb/presence";
import { updateMatch } from "@/lib/firestore/matches";
import { LiveBroadcastDesk, type BroadcastView } from "@/components/live/live-broadcast-desk";
import { LiveControlHeader } from "@/components/live/live-control-header";
import { FootballPanel } from "@/components/live/scoring-panels/football-panel";
import { CricketPanel } from "@/components/live/scoring-panels/cricket-panel";
import { PadelPanel } from "@/components/live/scoring-panels/padel-panel";
import { BasketballPanel } from "@/components/live/scoring-panels/basketball-panel";
import { BadmintonPanel } from "@/components/live/scoring-panels/badminton-panel";
import {
  Play, Pause, Square, RotateCcw,
  MessageSquare, List, Send, Users,
} from "lucide-react";
import { toast } from "sonner";

type FeedTab = "commentary" | "events";

export default function LiveControlRoomPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { user } = useAuth();
  const {
    meta, events, commentary, presence, isConnected,
    undoEvent, end, halfTime, resume, claim,
  } = useLiveMatch(matchId);
  const clock = useMatchClock(meta);
  const { lineups, isLoading: lineupsLoading } = useLiveLineups(matchId);
  const { match: firestoreMatch } = useMatch(
    meta?.clubId ?? null,
    meta?.firestoreMatchId ?? null,
    meta?.tournamentId,
  );

  const [view, setView] = useState<BroadcastView>("overview");
  const [feedTab, setFeedTab] = useState<FeedTab>("commentary");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);

  useEffect(() => {
    if (!user || !matchId) return;
    return joinPresence(matchId, user.uid, { name: user.displayName, role: "organizer" });
  }, [matchId, user]);

  useEffect(() => {
    if (!user || !meta || claimed) return;
    claim(user.uid, user.displayName)
      .then((ok) => {
        setClaimed(ok);
        if (!ok) toast.error("Another scorekeeper is controlling this match.");
      })
      .catch(() => toast.error("Could not claim scorekeeper. Check you are signed in."));
  }, [meta?.status, user, meta, claimed, claim]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
        authorId: user.uid,
        authorName: user.displayName,
        authorRole: "commentator",
        type: "manual",
        text: comment.trim(),
        period: meta?.period ?? "match",
        visibility: "public",
        pinned: false,
        highlighted: false,
        createdAt: Date.now(),
      });
      setComment("");
    } finally {
      setSending(false);
    }
  };

  const handleEndMatch = async () => {
    if (!endConfirm) {
      setEndConfirm(true);
      setTimeout(() => setEndConfirm(false), 4000);
      return;
    }
    try {
      await end();
      if (meta?.clubId && meta?.firestoreMatchId) {
        await updateMatch(meta.clubId, meta.firestoreMatchId, {
          status: "completed",
          homeScore: meta.homeScore,
          awayScore: meta.awayScore,
        }, meta.tournamentId ?? undefined);
      }
      toast.success("Match ended. Scores saved.");
    } catch {
      toast.error("Failed to end match.");
    }
  };

  if (!meta && isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Match not found in real-time database.</p>
      </div>
    );
  }

  const presenceList = Object.values(presence ?? {});
  const streamLinked = Boolean(firestoreMatch?.youtubeEmbedUrl);
  const matchHubHref = meta?.clubId && meta?.firestoreMatchId
    ? meta.tournamentId
      ? `/dashboard/clubs/${meta.clubId}/tournaments/${meta.tournamentId}/matches/${meta.firestoreMatchId}`
      : `/dashboard/clubs/${meta.clubId}/matches/${meta.firestoreMatchId}`
    : undefined;

  const scoringPanel = (() => {
    if (!meta) return null;
    const sport = meta.sport?.toLowerCase() ?? "";
    const props = { matchId, meta, authorId: user?.uid ?? "", authorName: user?.displayName ?? "" };
    if (sport === "football" || sport === "soccer") return <FootballPanel {...props} />;
    if (sport === "cricket") return <CricketPanel {...props} />;
    if (sport === "padel") return <PadelPanel {...props} />;
    if (sport === "basketball") return <BasketballPanel {...props} />;
    if (sport === "badminton" || sport === "pickleball") return <BadmintonPanel {...props} sport={meta.sport} />;
    return <div className="text-center text-muted-foreground py-8">No scoring panel for {meta.sport}</div>;
  })();

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden z-50">
      <LiveControlHeader
        meta={meta}
        clock={clock}
        isConnected={isConnected}
        presenceCount={presenceList.length}
        streamLinked={streamLinked}
        matchHubHref={matchHubHref}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] overflow-hidden min-h-0">
        {/* Left — match controls */}
        <aside className="hidden lg:flex border-r border-border bg-card/40 flex-col overflow-y-auto">
          <div className="p-4 border-b border-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Match controls
            </p>
            {meta?.status === "live" && (
              <>
                <button
                  type="button"
                  onClick={() => halfTime()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium hover:bg-accent transition"
                >
                  <Pause className="w-3.5 h-3.5" /> Half time
                </button>
                <button
                  type="button"
                  onClick={() => resume("second_half")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium hover:bg-accent transition"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              </>
            )}
            {meta?.status === "halftime" && (
              <button
                type="button"
                onClick={() => resume("second_half")}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-win/15 text-win border border-win/25 text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5" /> Start 2nd half
              </button>
            )}
            <button
              type="button"
              onClick={() => undoEvent()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium hover:bg-accent transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo last event
            </button>
            <button
              type="button"
              onClick={() => void handleEndMatch()}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition ${
                endConfirm ? "bg-loss text-white border-loss animate-pulse" : "border-loss/40 text-loss hover:bg-loss/10"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              {endConfirm ? "Confirm end" : "End match"}
            </button>
          </div>

          <div className="p-4 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick nav</p>
            {(["overview", "scoring", "lineups", "broadcast"] as BroadcastView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                  view === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {presenceList.length > 0 && (
            <div className="p-4 border-t border-border mt-auto">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Crew online
              </p>
              <div className="space-y-1.5">
                {presenceList.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-win" />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-[10px] opacity-60">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center — broadcast desk */}
        <main className="min-h-0 flex flex-col overflow-hidden">
          {meta && (
            <LiveBroadcastDesk
              view={view}
              onViewChange={setView}
              meta={meta}
              firestoreMatch={firestoreMatch}
              lineups={lineups}
              lineupsLoading={lineupsLoading}
              matchId={matchId}
              authorId={user?.uid ?? ""}
              authorName={user?.displayName ?? ""}
              scoringPanel={scoringPanel}
              streamLinked={streamLinked}
            />
          )}
        </main>

        {/* Right — commentary feed */}
        <aside className="hidden lg:flex border-l border-border bg-card/40 flex-col min-h-0">
          <div className="flex border-b border-border shrink-0">
            {([["commentary", MessageSquare, "Commentary"], ["events", List, "Events"]] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFeedTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition ${
                  feedTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {feedTab === "commentary" ? (
              commentary.length === 0 ? (
                <p className="text-center py-8 text-xs text-muted-foreground">Commentary feed</p>
              ) : (
                commentary.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-lg p-2.5 text-xs ${
                      entry.highlighted ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <p className="text-foreground leading-relaxed">{entry.text}</p>
                    <p className="text-muted-foreground mt-1 opacity-60">{entry.period} · {entry.authorName}</p>
                  </div>
                ))
              )
            ) : (
              events.filter((e) => !e.undone).map((event) => (
                <div key={event.id} className="rounded-lg bg-muted/30 p-2.5 text-xs">
                  <p className="font-medium">{event.description}</p>
                  <p className="text-muted-foreground mt-0.5">{event.period} · {event.teamName}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendComment();
                  }
                }}
                placeholder="Broadcast commentary…"
                rows={2}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-input border border-border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => void sendComment()}
                disabled={sending || !comment.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {["GOAL! 🎯", "WICKET! 🏏", "Substitution", "VAR check"].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setComment(phrase)}
                  className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground hover:bg-accent"
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
