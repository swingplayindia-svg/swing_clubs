"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTournament } from "@/hooks/use-club-data";
import type { Club } from "@/lib/schemas/club";

interface TopbarProps {
  club?: Club | null;
  extraCrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

const pathLabels: Record<string, string> = {
  overview:        "Overview",
  members:         "Members",
  "join-requests": "Join Requests",
  teams:           "Teams",
  tournaments:     "Tournaments",
  matches:         "Matches",
  standings:       "Standings",
  news:            "News",
  settings:        "Settings",
  fixtures:        "Fixtures",
  bracket:         "Bracket",
  "top-players":   "Top Players",
  live:            "Live Control",
};

export function Topbar({ club, extraCrumbs = [], actions }: TopbarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const tournamentIdMatch = pathname.match(/\/tournaments\/([^/]+)/);
  const tournamentId = tournamentIdMatch?.[1] ?? null;
  const { tournament } = useTournament(club?.id ?? null, tournamentId);

  const crumbs: { label: string; href?: string }[] = [];

  if (club) {
    crumbs.push({ label: club.name, href: `/dashboard/clubs/${club.id}` });
  }

  // Parse path segments
  let afterClub        = false;
  let afterTournament  = false;
  let afterTeams       = false;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === "clubs") { afterClub = true; continue; }
    if (afterClub && seg === club?.id) { afterClub = false; continue; }
    if (seg === "tournaments" && !afterTournament) {
      crumbs.push({ label: "Tournaments", href: `/dashboard/clubs/${club?.id}/tournaments` });
      afterTournament = true;
      continue;
    }
    if (afterTournament && seg === tournamentId && tournament) {
      crumbs.push({
        label: tournament.name,
        href: `/dashboard/clubs/${club?.id}/tournaments/${tournamentId}`,
      });
      continue;
    }
    if (afterTournament && !pathLabels[seg]) continue;
    if (seg === "teams") {
      crumbs.push({ label: "Teams", href: `/dashboard/clubs/${club?.id}/teams` });
      afterTeams = true;
      continue;
    }
    if (afterTeams && !pathLabels[seg]) { afterTeams = false; continue; } // skip team ID
    const label = pathLabels[seg];
    if (label) crumbs.push({ label });
  }

  extraCrumbs.forEach((c) => crumbs.push(c));

  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "Dashboard";

  return (
    <header className="h-[52px] border-b border-border bg-card/80 backdrop-blur-md flex items-center px-5 gap-4 sticky top-0 z-30">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1 min-w-0 shrink-0">
              {i > 0 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              )}
              <span
                className={
                  isLast
                    ? "text-foreground font-semibold truncate text-[13px]"
                    : "text-muted-foreground truncate text-[13px] hover:text-foreground transition-colors cursor-default"
                }
              >
                {crumb.label}
              </span>
            </span>
          );
        })}
      </nav>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
