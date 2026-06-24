"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "@/hooks/use-club-data";
import { formatDate, sportEmoji } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, Loader2 } from "lucide-react";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Teams", href: "/teams" },
  { label: "Fixtures", href: "/fixtures" },
  { label: "Matches", href: "/matches" },
  { label: "Standings", href: "/standings" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  registration: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  active: "bg-win/15 text-win border-win/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-loss/15 text-loss border-loss/30",
};

export default function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string; tournamentId: string }>;
}) {
  const { clubId, tournamentId } = use(params);
  const pathname = usePathname();
  const { tournament, isLoading } = useTournament(clubId, tournamentId);
  const base = `/dashboard/clubs/${clubId}/tournaments/${tournamentId}`;

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading tournament…
        </div>
      ) : tournament ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-lg font-bold text-foreground">{tournament.name}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyles[tournament.status] ?? statusStyles.draft}`}>
                    {tournament.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sportEmoji(tournament.sport)} {tournament.sport}
                  {" · "}
                  {tournament.format.replace(/_/g, " ")}
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(tournament.startDate)}
                    {tournament.endDate ? ` – ${formatDate(tournament.endDate)}` : ""}
                  </span>
                </p>
                {tournament.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tournament.description}</p>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-semibold text-foreground text-sm score-digits">
                  {tournament.teamCount}{tournament.maxTeams ? ` / ${tournament.maxTeams}` : ""} teams
                </p>
                <p>{tournament.matchCount} matches</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-0.5 px-3 overflow-x-auto border-b border-border bg-muted/20">
            {TABS.map((tab) => {
              const href = `${base}${tab.href}`;
              const active = tab.href === ""
                ? pathname === href
                : pathname.startsWith(href);
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={cn(
                    "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
                    active
                      ? "border-primary text-primary bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tournament not found.</p>
      )}

      {children}
    </div>
  );
}
