"use client";

import { use } from "react";
import Link from "next/link";
import { useTeams, useMatches, useStandings } from "@/hooks/use-club-data";
import { formatDate, sportEmoji } from "@/lib/utils";
import { Users, Calendar, BarChart3 } from "lucide-react";

export default function TournamentOverviewPage({ params }: { params: Promise<{ clubId: string; tournamentId: string }> }) {
  const { clubId, tournamentId } = use(params);
  const { teams }    = useTeams(clubId, tournamentId);
  const { matches }  = useMatches(clubId, tournamentId);
  const { standings } = useStandings(clubId, tournamentId);

  const completed = matches.filter((m) => m.status === "completed").length;
  const upcoming  = matches.filter((m) => m.status === "scheduled").length;
  const live      = matches.filter((m) => m.status === "live").length;

  const tabs = [
    { label: "Teams",     href: "teams",    icon: Users,     count: teams.length },
    { label: "Fixtures",  href: "fixtures", icon: Calendar,  count: upcoming },
    { label: "Matches",   href: "matches",  icon: Calendar,  count: matches.length },
    { label: "Standings", href: "standings",icon: BarChart3, count: standings.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Teams",     value: teams.length, color: "text-chart-2" },
          { label: "Completed", value: completed,    color: "text-win" },
          { label: "Upcoming",  value: upcoming,     color: "text-chart-4" },
          { label: "Live",      value: live,          color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-3xl font-bold score-digits ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`/dashboard/clubs/${clubId}/tournaments/${tournamentId}/${tab.href}`}
            className="rounded-xl border border-border bg-card p-5 hover:border-border/70 hover:bg-card/80 transition flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <tab.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{tab.label}</p>
              <p className="text-xs text-muted-foreground">{tab.count} {tab.label.toLowerCase()}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
