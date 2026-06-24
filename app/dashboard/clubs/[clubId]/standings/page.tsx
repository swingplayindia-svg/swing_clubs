"use client";

import { use } from "react";
import { useStandings } from "@/hooks/use-club-data";
import { formatDate } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = { W: "bg-win text-white", D: "bg-draw text-white", L: "bg-loss text-white" };
  return <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${colors[result] ?? "bg-muted text-muted-foreground"}`}>{result}</span>;
}

export default function StandingsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }    = use(params);
  const { standings } = useStandings(clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Standings</h1>
        <p className="text-sm text-muted-foreground">Club-wide league table across all competitions</p>
      </div>

      {standings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No standings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Standings update automatically when matches are completed.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                {["Pos", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts", "Form"].map((h) => (
                  <th key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 text-center first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {standings.map((row) => (
                <tr key={row.teamId} className="hover:bg-accent/20 transition-colors">
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      row.position === 1 ? "bg-chart-4/20 text-chart-4" :
                      row.position === 2 ? "bg-muted text-foreground" :
                      row.position === 3 ? "bg-chart-1/10 text-chart-1" :
                      "text-muted-foreground"
                    }`}>{row.position}</span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-foreground text-left">{row.teamName}</td>
                  {[row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst].map((v, i) => (
                    <td key={i} className="px-3 py-3 text-center text-muted-foreground">{v}</td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <span className={`font-medium ${row.goalDifference > 0 ? "text-win" : row.goalDifference < 0 ? "text-loss" : "text-muted-foreground"}`}>
                      {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-foreground">{row.points}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5 justify-center">
                      {(row.form ?? []).map((r, i) => <FormBadge key={i} result={r} />)}
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
