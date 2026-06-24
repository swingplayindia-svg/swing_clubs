"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/use-club-data";
import { startMatchLive } from "@/lib/start-match";
import { Radio } from "lucide-react";
import { toast } from "sonner";

export default function TournamentMatchesPage({ params }: { params: Promise<{ clubId: string; tournamentId: string }> }) {
  const { clubId, tournamentId } = use(params);
  const { matches }              = useMatches(clubId, tournamentId);
  const [starting, setStarting]  = useState<string | null>(null);
  const sorted = [...matches].sort((a, b) => b.matchDate - a.matchDate);

  const handleGoLive = async (match: typeof matches[number]) => {
    setStarting(match.id);
    try {
      await startMatchLive({
        id:           match.id,
        clubId:       match.clubId ?? clubId,
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
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">No matches yet.</div>
      ) : (
        sorted.map((match) => (
          <div key={match.id} className={`rounded-xl border bg-card p-4 flex items-center gap-4 ${match.status === "live" ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <div className="text-center w-12 shrink-0">
              <p className="text-xs text-muted-foreground">{new Date(match.matchDate).toLocaleDateString("en", { month: "short" })}</p>
              <p className="text-lg font-bold text-foreground">{new Date(match.matchDate).getDate()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{match.knockoutStage ?? `Round ${match.round ?? 1}`}</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{match.homeTeamName}</span>
                  {match.status !== "scheduled" && <span className="text-sm font-bold text-foreground">{match.homeScore}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{match.awayTeamName}</span>
                  {match.status !== "scheduled" && <span className="text-sm font-bold text-foreground">{match.awayScore}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {match.status === "live" && (
                <Link href={`/dashboard/live/${match.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition">
                  <Radio className="w-3 h-3" /> Control
                </Link>
              )}
              {match.status === "scheduled" && (
                <button
                  onClick={() => handleGoLive(match)}
                  disabled={starting === match.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition disabled:opacity-50"
                >
                  <Radio className="w-3 h-3" /> {starting === match.id ? "Starting…" : "Go Live"}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
