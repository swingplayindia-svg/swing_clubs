"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTournaments } from "@/hooks/use-club-data";
import { createTournament, updateTournament } from "@/lib/firestore/tournaments";
import { formatDate, sportEmoji } from "@/lib/utils";
import { Plus, Trophy, Users, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import type { TournamentFormat, TournamentStatus } from "@/lib/schemas/tournament";

const SPORTS   = ["Football", "Cricket", "Padel", "Pickleball", "Basketball", "Badminton"];
const FORMATS: TournamentFormat[]  = ["league", "knockout", "league_knockout", "round_robin", "swiss"];
const statusColors: Record<TournamentStatus, string> = {
  draft:        "bg-muted text-muted-foreground border-border",
  registration: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  active:       "bg-win/15 text-win border-win/30",
  completed:    "bg-muted text-muted-foreground border-border",
  cancelled:    "bg-loss/15 text-loss border-loss/30",
};

function CreateTournamentModal({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const [name,      setName]      = useState("");
  const [sport,     setSport]     = useState(SPORTS[0]);
  const [format,    setFormat]    = useState<TournamentFormat>("league");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [maxTeams,  setMaxTeams]  = useState(8);
  const [desc,      setDesc]      = useState("");
  const [saving,    setSaving]    = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) return;
    setSaving(true);
    try {
      await createTournament(clubId, {
        clubId,
        name: name.trim(),
        description: desc.trim(),
        sport,
        format,
        status: "draft",
        startDate: new Date(startDate).getTime(),
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        maxTeams,
        registrationOpen: false,
        teamCount: 0,
        matchCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      toast.success("Tournament created.");
      onClose();
    } catch {
      toast.error("Failed to create tournament.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">New Tournament</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Summer League 2025" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Sport</label>
              <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {SPORTS.map((s) => <option key={s} value={s}>{sportEmoji(s)} {s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as TournamentFormat)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {FORMATS.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Max Teams: {maxTeams}</label>
            <input type="range" min={2} max={64} value={maxTeams} onChange={(e) => setMaxTeams(+e.target.value)} className="w-full accent-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Tournament details…" rows={3} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">{saving ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TournamentsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }    = use(params);
  const { tournaments } = useTournaments(clubId);
  const [showCreate,  setShowCreate] = useState(false);

  const handlePublish = async (tournamentId: string, current: TournamentStatus) => {
    const next = current === "draft" ? "registration" : current === "registration" ? "active" : "completed";
    try {
      await updateTournament(clubId, tournamentId, { status: next });
      toast.success(`Tournament ${next}.`);
    } catch {
      toast.error("Failed to update tournament.");
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && <CreateTournamentModal clubId={clubId} onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tournaments</h1>
          <p className="text-sm text-muted-foreground">{tournaments.length} tournaments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" /> New Tournament
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No tournaments yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" /> New Tournament
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5 hover:border-border/70 transition">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{t.name}</h3>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[t.status]}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{sportEmoji(t.sport)} {t.sport} · {t.format.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.teamCount}/{t.maxTeams ?? "∞"} teams</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(t.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/clubs/${clubId}/tournaments/${t.id}`} className="flex-1 text-center py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition">
                  Manage
                </Link>
                {t.status !== "completed" && t.status !== "cancelled" && (
                  <button onClick={() => handlePublish(t.id, t.status)} className="flex-1 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25 text-xs font-medium hover:bg-primary/25 transition">
                    {t.status === "draft" ? "Open Registration" : t.status === "registration" ? "Start Tournament" : "Complete"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
