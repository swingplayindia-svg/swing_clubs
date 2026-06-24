"use client";

import { use, useState } from "react";
import { useTeams, useMatches, useStandings, useTournament } from "@/hooks/use-club-data";
import { recalculateStandingsFromMatches, upsertStanding } from "@/lib/firestore/standings";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function FormBadge({ result }: { result: string }) {
  const c: Record<string, string> = {
    W: "bg-win text-white",
    D: "bg-draw text-white",
    L: "bg-loss text-white",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${c[result] ?? "bg-muted text-muted-foreground"}`}>
      {result}
    </span>
  );
}

export default function TournamentStandingsPage({
  params,
}: {
  params: Promise<{ clubId: string; tournamentId: string }>;
}) {
  const { clubId, tournamentId } = use(params);
  const { tournament } = useTournament(clubId, tournamentId);
  const { teams } = useTeams(clubId, tournamentId);
  const { matches } = useMatches(clubId, tournamentId);
  const { standings } = useStandings(clubId, tournamentId);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (teams.length === 0) {
      toast.error("Add teams to the tournament first.");
      return;
    }
    setRecalculating(true);
    try {
      const rows = recalculateStandingsFromMatches(
        teams.map((t) => ({ id: t.id, name: t.name, sport: t.sport })),
        matches,
        tournament?.sport ?? teams[0]?.sport ?? "Football",
      );
      await Promise.all(rows.map((row) => upsertStanding(clubId, row, tournamentId)));
      toast.success("Standings updated from completed matches.");
    } catch {
      toast.error("Failed to recalculate standings.");
    } finally {
      setRecalculating(false);
    }
  };

  const completedCount = matches.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {completedCount} completed match{completedCount === 1 ? "" : "es"}
          {standings.length > 0 ? ` · ${standings.length} teams ranked` : ""}
        </p>
        <button
          type="button"
          onClick={() => void handleRecalculate()}
          disabled={recalculating || teams.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-accent transition disabled:opacity-50"
        >
          {recalculating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Recalculate standings
        </button>
      </div>

      {standings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No standings yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Complete matches, then click Recalculate to generate the league table.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Pos", "Team", "P", "W", "D", "L", "GD", "Pts", "Form"].map((h) => (
                  <th
                    key={h}
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 text-center first:text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {standings.map((row) => (
                <tr key={row.teamId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-3 text-center font-bold text-foreground">{row.position}</td>
                  <td className="px-3 py-3 font-semibold text-foreground text-left">{row.teamName}</td>
                  {[row.played, row.won, row.drawn, row.lost].map((v, i) => (
                    <td key={i} className="px-3 py-3 text-center text-muted-foreground">{v}</td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <span
                      className={
                        row.goalDifference > 0
                          ? "text-win"
                          : row.goalDifference < 0
                            ? "text-loss"
                            : "text-muted-foreground"
                      }
                    >
                      {row.goalDifference > 0 ? "+" : ""}
                      {row.goalDifference}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-foreground">{row.points}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5 justify-center">
                      {(row.form ?? []).map((r, i) => (
                        <FormBadge key={i} result={r} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
