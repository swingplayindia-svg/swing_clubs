"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatches } from "@/hooks/use-club-data";
import { startMatchLive } from "@/lib/start-match";
import { formatTime, sportEmoji } from "@/lib/utils";
import type { MatchStatus } from "@/lib/schemas/match";
import { ChevronRight, Film, Radio, Star } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<MatchStatus, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  live: "bg-primary/15 text-primary border-primary/30",
  halftime: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  completed: "bg-win/15 text-win border-win/30",
  cancelled: "bg-loss/15 text-loss border-loss/30",
  postponed: "bg-muted text-muted-foreground border-border",
};

export default function TournamentMatchesPage({ params }: { params: Promise<{ clubId: string; tournamentId: string }> }) {
  const { clubId, tournamentId } = use(params);
  const router                   = useRouter();
  const { matches }              = useMatches(clubId, tournamentId);
  const [starting, setStarting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");

  const sorted = useMemo(
    () => [...matches].sort((a, b) => b.matchDate - a.matchDate),
    [matches],
  );

  const filtered = statusFilter === "all" ? sorted : sorted.filter((m) => m.status === statusFilter);
  const liveCount = matches.filter((m) => m.status === "live" || m.status === "halftime").length;
  const completedCount = matches.filter((m) => m.status === "completed").length;

  const handleGoLive = async (match: typeof matches[number], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStarting(match.id);
    try {
      await startMatchLive({
        id: match.id,
        clubId: match.clubId ?? clubId,
        tournamentId: match.tournamentId ?? tournamentId,
      });
      toast.success("Match is now live.");
      window.open(`/dashboard/live/${match.id}`, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start match.";
      toast.error(message);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black score-digits text-foreground">{matches.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-2xl font-black score-digits text-primary">{liveCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Live now</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black score-digits text-win">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Completed</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "scheduled", "live", "halftime", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition capitalize ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
          No matches in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => (
            <div
              key={match.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/clubs/${clubId}/tournaments/${tournamentId}/matches/${match.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(`/dashboard/clubs/${clubId}/tournaments/${tournamentId}/matches/${match.id}`);
                }
              }}
              className={`rounded-xl border bg-card p-4 flex items-center gap-4 transition hover:border-primary/30 hover:shadow-sm group cursor-pointer ${
                match.status === "live" ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div className="text-center w-14 shrink-0">
                <p className="text-xs text-muted-foreground">
                  {new Date(match.matchDate).toLocaleDateString("en", { month: "short" })}
                </p>
                <p className="text-xl font-bold text-foreground">{new Date(match.matchDate).getDate()}</p>
                <p className="text-[10px] text-muted-foreground">{formatTime(match.matchDate)}</p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColors[match.status]}`}>
                    {match.status === "live" && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary live-dot mr-1 align-middle" />
                    )}
                    {match.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {match.knockoutStage ?? (match.round != null ? `Round ${match.round}` : "Group")}
                  </span>
                  <span className="text-xs text-muted-foreground">{sportEmoji(match.sport)} {match.sport}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{match.homeTeamName}</span>
                    {match.status !== "scheduled" && (
                      <span className="text-sm font-bold text-foreground score-digits tabular-nums">{match.homeScore}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{match.awayTeamName}</span>
                    {match.status !== "scheduled" && (
                      <span className="text-sm font-bold text-foreground score-digits tabular-nums">{match.awayScore}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {match.manOfTheMatchName && (
                    <span className="text-[10px] text-primary inline-flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> {match.manOfTheMatchName}
                    </span>
                  )}
                  {(match.highlights?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Film className="w-3 h-3" /> {match.highlights!.length} clips
                    </span>
                  )}
                  {match.youtubeEmbedUrl && (
                    <span className="text-[10px] text-muted-foreground">📺 Stream linked</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {match.status === "live" && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/live/${match.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition"
                  >
                    <Radio className="w-3 h-3" /> Control
                  </button>
                )}
                {match.status === "scheduled" && (
                  <button
                    type="button"
                    onClick={(e) => void handleGoLive(match, e)}
                    disabled={starting === match.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition disabled:opacity-50"
                  >
                    <Radio className="w-3 h-3" /> {starting === match.id ? "Starting…" : "Go Live"}
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
