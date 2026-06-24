"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatches, useTeams } from "@/hooks/use-club-data";
import { createMatch } from "@/lib/firestore/matches";
import { startMatchLive } from "@/lib/start-match";
import { formatDate, formatTime, sportEmoji } from "@/lib/utils";
import { Plus, Radio, Check, Clock, X, Calendar as CalIcon, ChevronRight, Film } from "lucide-react";
import { toast } from "sonner";
import type { MatchStatus } from "@/lib/schemas/match";

const SPORTS = ["Football", "Cricket", "Padel", "Pickleball", "Basketball", "Badminton"];

const statusColors: Record<MatchStatus, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  live:       "bg-primary/15 text-primary border-primary/30",
  halftime:  "bg-chart-4/15 text-chart-4 border-chart-4/30",
  completed: "bg-win/15 text-win border-win/30",
  cancelled: "bg-loss/15 text-loss border-loss/30",
  postponed: "bg-muted text-muted-foreground border-border",
};

function CreateMatchModal({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const { teams } = useTeams(clubId);
  const [sport,     setSport]     = useState(SPORTS[0]);
  const [homeTeam,  setHomeTeam]  = useState("");
  const [awayTeam,  setAwayTeam]  = useState("");
  const [date,      setDate]      = useState("");
  const [time,      setTime]      = useState("18:00");
  const [venue,     setVenue]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const sportTeams = teams.filter((t) => t.sport === sport || !sport);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || !date) return;
    if (homeTeam === awayTeam) { toast.error("Home and away teams must be different."); return; }
    setSaving(true);
    try {
      const homeTeamData = teams.find((t) => t.id === homeTeam)!;
      const awayTeamData = teams.find((t) => t.id === awayTeam)!;
      const matchDate    = new Date(`${date}T${time}`).getTime();
      await createMatch(clubId, {
        clubId,
        homeTeamId:   homeTeam,
        homeTeamName: homeTeamData.name,
        awayTeamId:   awayTeam,
        awayTeamName: awayTeamData.name,
        homeScore:    0,
        awayScore:    0,
        status:       "scheduled",
        sport,
        matchDate,
        venue:        venue || undefined,
        isKnockout:   false,
        createdAt:    Date.now(),
        updatedAt:    Date.now(),
      });
      toast.success("Match scheduled.");
      onClose();
    } catch {
      toast.error("Failed to create match.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Schedule Match</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
              {SPORTS.map((s) => <option key={s} value={s}>{sportEmoji(s)} {s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Home Team</label>
              <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Select…</option>
                {sportTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Away Team</label>
              <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Select…</option>
                {sportTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Venue (optional)</label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Main Stadium" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition">Cancel</button>
            <button type="submit" disabled={saving || !homeTeam || !awayTeam || !date} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">{saving ? "Saving…" : "Schedule"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MatchesPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }      = use(params);
  const router          = useRouter();
  const { matches }     = useMatches(clubId);
  const [showCreate,    setShowCreate]   = useState(false);
  const [statusFilter,  setStatusFilter] = useState<MatchStatus | "all">("all");
  const [starting,      setStarting]     = useState<string | null>(null);

  const filtered = statusFilter === "all" ? matches : matches.filter((m) => m.status === statusFilter);
  const sorted   = [...filtered].sort((a, b) => b.matchDate - a.matchDate);

  const handleGoLive = async (match: { id: string; clubId?: string; tournamentId?: string }) => {
    setStarting(match.id);
    try {
      await startMatchLive({
        id:           match.id,
        clubId:       match.clubId ?? clubId,
        tournamentId: match.tournamentId,
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
    <div className="space-y-6">
      {showCreate && <CreateMatchModal clubId={clubId} onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Matches</h1>
          <p className="text-sm text-muted-foreground">{matches.length} total matches</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" /> Schedule Match
        </button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "scheduled", "live", "halftime", "completed", "cancelled"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{s}</button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <CalIcon className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No matches found</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" /> Schedule Match
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((match) => (
            <div
              key={match.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/clubs/${clubId}/matches/${match.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/dashboard/clubs/${clubId}/matches/${match.id}`);
              }}
              className={`rounded-xl border bg-card p-4 flex items-center gap-4 transition hover:border-primary/30 hover:shadow-sm group cursor-pointer ${match.status === "live" ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              {/* Date */}
              <div className="text-center w-12 shrink-0">
                <p className="text-xs text-muted-foreground">{new Date(match.matchDate).toLocaleDateString("en", { month: "short" })}</p>
                <p className="text-lg font-bold text-foreground">{new Date(match.matchDate).getDate()}</p>
                <p className="text-[10px] text-muted-foreground">{formatTime(match.matchDate)}</p>
              </div>

              {/* Teams + score */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColors[match.status]}`}>
                    {match.status === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary live-dot mr-1 align-middle" />}
                    {match.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">{sportEmoji(match.sport)} {match.sport}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{match.homeTeamName}</span>
                    {match.status !== "scheduled" && <span className="text-sm font-bold text-foreground score-digits ml-auto">{match.homeScore}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{match.awayTeamName}</span>
                    {match.status !== "scheduled" && <span className="text-sm font-bold text-foreground score-digits ml-auto">{match.awayScore}</span>}
                  </div>
                </div>
                {match.venue && <p className="text-xs text-muted-foreground mt-1">📍 {match.venue}</p>}
                {(match.highlights?.length ?? 0) > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <Film className="w-3 h-3" /> {match.highlights!.length} highlight{match.highlights!.length !== 1 ? "s" : ""}
                  </p>
                )}
                {match.manOfTheMatchName && (
                  <p className="text-[10px] text-primary mt-0.5">★ {match.manOfTheMatchName}</p>
                )}
              </div>

              {/* Actions */}
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
                  <button type="button" onClick={() => void handleGoLive(match)} disabled={starting === match.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition disabled:opacity-50">
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
