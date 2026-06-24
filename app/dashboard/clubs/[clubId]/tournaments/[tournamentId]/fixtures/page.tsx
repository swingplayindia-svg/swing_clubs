"use client";

import { use, useState } from "react";
import { useTeams, useMatches } from "@/hooks/use-club-data";
import { createMatch } from "@/lib/firestore/matches";
import { formatDate, formatTime } from "@/lib/utils";
import { Wand2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function TournamentFixturesPage({ params }: { params: Promise<{ clubId: string; tournamentId: string }> }) {
  const { clubId, tournamentId } = use(params);
  const { teams }                = useTeams(clubId, tournamentId);
  const { matches }              = useMatches(clubId, tournamentId);
  const [generating,             setGenerating] = useState(false);
  const [date,                   setDate]       = useState("");
  const [sport,                  setSport]      = useState("Football");

  const scheduled = matches.filter((m) => m.status === "scheduled").sort((a, b) => a.matchDate - b.matchDate);

  const generateRoundRobin = async () => {
    if (teams.length < 2) { toast.error("Need at least 2 teams."); return; }
    if (!date) { toast.error("Pick a start date first."); return; }
    setGenerating(true);
    try {
      const pairs: [typeof teams[0], typeof teams[0]][] = [];
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          pairs.push([teams[i], teams[j]]);
        }
      }
      const startDate = new Date(date).getTime();
      await Promise.all(
        pairs.map((pair, idx) =>
          createMatch(clubId, {
            clubId,
            tournamentId,
            homeTeamId:   pair[0].id,
            homeTeamName: pair[0].name,
            awayTeamId:   pair[1].id,
            awayTeamName: pair[1].name,
            homeScore:    0,
            awayScore:    0,
            status:       "scheduled",
            sport:        teams[0].sport || sport,
            matchDate:    startDate + idx * 86_400_000,
            isKnockout:   false,
            round:        Math.floor(idx / Math.ceil(teams.length / 2)) + 1,
            createdAt:    Date.now(),
            updatedAt:    Date.now(),
          }, tournamentId),
        ),
      );
      toast.success(`Generated ${pairs.length} fixtures.`);
    } catch {
      toast.error("Failed to generate fixtures.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-3">Auto-generate Fixtures</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Start Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button
            onClick={generateRoundRobin}
            disabled={generating || teams.length < 2 || !date}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            {generating ? "Generating…" : `Generate Round Robin (${teams.length * (teams.length - 1) / 2} fixtures)`}
          </button>
        </div>
        {teams.length < 2 && <p className="text-xs text-muted-foreground mt-2">Add at least 2 teams to generate fixtures.</p>}
      </div>

      {/* Fixture list */}
      <div className="space-y-3">
        {scheduled.length === 0 ? (
          <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No scheduled fixtures yet.</p>
          </div>
        ) : (
          scheduled.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="text-center w-12">
                <p className="text-xs text-muted-foreground">{new Date(m.matchDate).toLocaleDateString("en", { month: "short" })}</p>
                <p className="text-lg font-bold text-foreground">{new Date(m.matchDate).getDate()}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{m.homeTeamName} <span className="text-muted-foreground font-normal">vs</span> {m.awayTeamName}</p>
                <p className="text-xs text-muted-foreground">{formatTime(m.matchDate)} · Round {m.round ?? 1}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
