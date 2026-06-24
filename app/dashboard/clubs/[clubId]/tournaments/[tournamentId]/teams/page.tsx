"use client";

import { use } from "react";
import { useTeams } from "@/hooks/use-club-data";
import { sportEmoji, initials } from "@/lib/utils";
import { Users } from "lucide-react";

export default function TournamentTeamsPage({ params }: { params: Promise<{ clubId: string; tournamentId: string }> }) {
  const { clubId, tournamentId } = use(params);
  const { teams }                = useTeams(clubId, tournamentId);

  return (
    <div>
      {teams.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No teams in this tournament yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{initials(team.name)}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.players.length} players{team.captainName ? ` · ${team.captainName}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
