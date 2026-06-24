"use client";

import { use } from "react";
import { useTeams, useMatches, useStandings } from "@/hooks/use-club-data";
import { Users, Calendar, BarChart3, Radio } from "lucide-react";

export default function TournamentOverviewPage({
  params,
}: {
  params: Promise<{ clubId: string; tournamentId: string }>;
}) {
  const { clubId, tournamentId } = use(params);
  const { teams } = useTeams(clubId, tournamentId);
  const { matches } = useMatches(clubId, tournamentId);
  const { standings } = useStandings(clubId, tournamentId);

  const completed = matches.filter((m) => m.status === "completed").length;
  const upcoming = matches.filter((m) => m.status === "scheduled").length;
  const live = matches.filter((m) => m.status === "live").length;

  const steps = [
    {
      step: 1,
      title: "Add teams",
      desc: teams.length > 0
        ? `${teams.length} team${teams.length === 1 ? "" : "s"} enrolled`
        : "Go to Teams tab and add club teams to the tournament",
      done: teams.length >= 2,
      tab: "teams",
    },
    {
      step: 2,
      title: "Generate fixtures",
      desc: upcoming > 0 || completed > 0
        ? `${matches.length} match${matches.length === 1 ? "" : "es"} scheduled`
        : "Use Fixtures tab to auto-generate round-robin schedule",
      done: matches.length > 0,
      tab: "fixtures",
    },
    {
      step: 3,
      title: "Play matches",
      desc: live > 0
        ? `${live} match${live === 1 ? "" : "es"} live now`
        : completed > 0
          ? `${completed} completed`
          : "Start matches from the Matches tab",
      done: completed > 0,
      tab: "matches",
    },
    {
      step: 4,
      title: "View standings",
      desc: standings.length > 0
        ? "Standings updated"
        : "Recalculate standings after matches complete",
      done: standings.length > 0,
      tab: "standings",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Teams", value: teams.length, icon: Users, color: "text-chart-2" },
          { label: "Upcoming", value: upcoming, icon: Calendar, color: "text-chart-4" },
          { label: "Live", value: live, icon: Radio, color: "text-primary" },
          { label: "Completed", value: completed, icon: BarChart3, color: "text-win" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold score-digits ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground mb-4">Tournament setup checklist</h2>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li
              key={s.step}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                s.done ? "border-win/30 bg-win/5" : "border-border bg-muted/20"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.done ? "bg-win text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {s.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <a
                href={`/dashboard/clubs/${clubId}/tournaments/${tournamentId}/${s.tab}`}
                className="text-xs font-semibold text-primary hover:underline shrink-0"
              >
                Open →
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
