"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useTeams, useTournament } from "@/hooks/use-club-data";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { getTeams } from "@/lib/firestore/teams";
import {
  addClubTeamToTournament,
  removeTeamFromTournament,
  syncTournamentTeamCount,
} from "@/lib/firestore/tournament-teams";
import { formatDate, initials, sportEmoji } from "@/lib/utils";
import { MemberAvatar } from "@/components/teams/member-avatar";
import type { Team } from "@/lib/schemas/team";
import {
  Loader2, Plus, Search, Trash2, Users, ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function TournamentTeamsPage({
  params,
}: {
  params: Promise<{ clubId: string; tournamentId: string }>;
}) {
  const { clubId, tournamentId } = use(params);
  const { tournament } = useTournament(clubId, tournamentId);
  const { teams: tournamentTeams } = useTeams(clubId, tournamentId);
  const { teams: clubTeams } = useTeams(clubId);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 280);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const enrolledIds = new Set(tournamentTeams.map((t) => t.id));

  const availableTeams = useMemo(() => {
    const sport = tournament?.sport;
    return clubTeams.filter((t) => {
      if (enrolledIds.has(t.id)) return false;
      if (sport && t.sport !== sport) return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.captainName?.toLowerCase().includes(q)
      );
    });
  }, [clubTeams, enrolledIds, tournament?.sport, debouncedSearch]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    const toAdd = clubTeams.filter((t) => selected.has(t.id));
    setAdding(true);
    try {
      for (const team of toAdd) {
        await addClubTeamToTournament(clubId, tournamentId, team);
      }
      const enrolled = await getTeams(clubId, tournamentId);
      await syncTournamentTeamCount(clubId, tournamentId, enrolled.length);
      toast.success(`Added ${toAdd.length} team${toAdd.length === 1 ? "" : "s"} to tournament.`);
      setSelected(new Set());
      setSearch("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add teams.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (team: Team) => {
    if (!confirm(`Remove "${team.name}" from this tournament?`)) return;
    setRemoving(team.id);
    try {
      await removeTeamFromTournament(clubId, tournamentId, team.id);
      const enrolled = await getTeams(clubId, tournamentId);
      await syncTournamentTeamCount(clubId, tournamentId, enrolled.length);
      toast.success("Team removed from tournament.");
    } catch {
      toast.error("Failed to remove team.");
    } finally {
      setRemoving(null);
    }
  };

  const atCapacity =
    tournament?.maxTeams != null && tournamentTeams.length >= tournament.maxTeams;

  return (
    <div className="space-y-6">
      {/* Add teams panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-foreground">Add Club Teams</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tournament?.sport
                ? `Showing ${tournament.sport} teams from your club`
                : "Select teams to enroll in this tournament"}
              {tournament?.maxTeams != null && (
                <> · {tournamentTeams.length}/{tournament.maxTeams} slots used</>
              )}
            </p>
          </div>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => void handleAddSelected()}
              disabled={adding || atCapacity}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add {selected.size} team{selected.size === 1 ? "" : "s"}
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams by name or captain…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {atCapacity ? (
            <p className="text-sm text-amber-600 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
              Tournament is at maximum capacity ({tournament?.maxTeams} teams).
            </p>
          ) : availableTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
              {clubTeams.length === 0
                ? "Create club teams first, then add them here."
                : enrolledIds.size === clubTeams.filter((t) => !tournament?.sport || t.sport === tournament.sport).length
                  ? "All eligible club teams are already in this tournament."
                  : "No teams match your search."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {availableTeams.map((team) => {
                const isSelected = selected.has(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleSelect(team.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xs font-bold text-primary">
                          {initials(team.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{team.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {team.memberCount || team.players?.length || 0} players
                        {team.captainName ? ` · ${team.captainName}` : ""}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enrolled teams table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Enrolled Teams</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tournamentTeams.length} team{tournamentTeams.length === 1 ? "" : "s"} in tournament
            </p>
          </div>
        </div>

        {tournamentTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No teams enrolled yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Select club teams above and click Add to build your tournament roster.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Team</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Captain</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Players</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Record</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {tournamentTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xs font-bold text-primary">
                              {initials(team.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{sportEmoji(team.sport)} {team.sport}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {team.captainName ? (
                        <div className="flex items-center gap-2">
                          <MemberAvatar
                            name={team.captainName}
                            avatarUrl={team.captainAvatarUrl}
                            size="sm"
                          />
                          <span className="text-sm truncate">{team.captainName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {team.memberCount || team.players?.length || 0}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {team.wins}W · {team.draws}D · {team.losses}L
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/clubs/${clubId}/teams/${team.id}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                          title="Manage squad"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleRemove(team)}
                          disabled={removing === team.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                          title="Remove from tournament"
                        >
                          {removing === team.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
