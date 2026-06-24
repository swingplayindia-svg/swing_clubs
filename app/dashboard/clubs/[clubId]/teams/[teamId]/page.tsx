"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMembers, useTeam } from "@/hooks/use-club-data";
import { deleteTeam, updateTeam } from "@/lib/firestore/teams";
import { firestoreErrorMessage } from "@/lib/firestore/sanitize";
import { MemberCombobox, memberUserId } from "@/components/teams/member-combobox";
import { MemberAvatar } from "@/components/teams/member-avatar";
import { SquadChart } from "@/components/teams/squad-chart";
import {
  captainPlayer,
  memberToPlayer,
  serializePlayers,
  syncCaptainInRoster,
} from "@/lib/team-players";
import { positionsForSport } from "@/lib/sport-positions";
import { formatDate, initials, sportEmoji } from "@/lib/utils";
import type { Team, TeamPlayer } from "@/lib/schemas/team";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import {
  ArrowLeft, BarChart3, Camera, ChevronRight, LayoutGrid, Loader2,
  Plus, Save, Settings2, Star, Trash2, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";

const SPORTS = [
  "Football", "Cricket", "Padel", "Pickleball",
  "Basketball", "Badminton", "Tennis", "Hockey",
];

type Tab = "squad" | "formation" | "settings";

async function uploadTeamLogo(
  clubId: string,
  teamId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sRef = storageRef(getFirebaseStorage(), `clubs/${clubId}/teams/${teamId}/logo`);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-center min-w-[72px]">
      <p className={`text-xl font-bold score-digits ${accent ?? "text-foreground"}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function RosterRow({
  player,
  isCaptain,
  positions,
  busy,
  onSave,
  onMakeCaptain,
  onRemove,
}: {
  player: TeamPlayer;
  isCaptain: boolean;
  positions: string[];
  busy: boolean;
  onSave: (patch: Partial<TeamPlayer>) => Promise<void>;
  onMakeCaptain: () => void;
  onRemove: () => void;
}) {
  const [jersey, setJersey] = useState(player.jerseyNumber?.toString() ?? "");
  const [position, setPosition] = useState(player.position ?? "");

  useEffect(() => {
    setJersey(player.jerseyNumber?.toString() ?? "");
    setPosition(player.position ?? "");
  }, [player.jerseyNumber, player.position]);

  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 w-20">
        <input
          type="number"
          min={1}
          max={99}
          value={jersey}
          disabled={busy}
          onChange={(e) => setJersey(e.target.value)}
          onBlur={() => {
            const next = jersey ? Number(jersey) : undefined;
            if (next !== player.jerseyNumber) void onSave({ jerseyNumber: next });
          }}
          className="w-14 px-2 py-1.5 rounded-lg bg-input border border-border text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="—"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <MemberAvatar name={player.displayName} avatarUrl={player.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{player.displayName}</p>
            {isCaptain && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium mt-0.5">
                <Star className="w-3 h-3 fill-current" /> Team Captain
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={position}
          disabled={busy || isCaptain}
          onChange={(e) => {
            setPosition(e.target.value);
            void onSave({ position: e.target.value || undefined });
          }}
          className="min-w-[100px] px-2.5 py-1.5 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        >
          <option value="">Unassigned</option>
          {isCaptain && <option value="Captain">Captain</option>}
          {positions.filter((p) => p !== "Captain").map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {!isCaptain && (
            <>
              <button
                type="button"
                onClick={onMakeCaptain}
                disabled={busy}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition disabled:opacity-50"
              >
                Make captain
              </button>
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                title="Remove from squad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; teamId: string }>;
}) {
  const router = useRouter();
  const { clubId, teamId } = use(params);
  const { team, isLoading } = useTeam(clubId, teamId);
  const { members } = useMembers(clubId);

  const [tab, setTab] = useState<Tab>("squad");
  const [updating, setUpdating] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Add player form
  const [addUserId, setAddUserId]     = useState("");
  const [addPosition, setAddPosition] = useState("");
  const [addJersey, setAddJersey]     = useState("");

  // Settings form
  const [editName, setEditName]       = useState("");
  const [editSport, setEditSport]     = useState("");
  const [editCaptain, setEditCaptain] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoProgress, setLogoProgress] = useState<number | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!team) return;
    setEditName(team.name);
    setEditSport(team.sport);
    setEditCaptain(team.captainId ?? "");
    setAddPosition(positionsForSport(team.sport)[0] ?? "Player");
  }, [team?.id, team?.name, team?.sport, team?.captainId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading team…</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-32">
        <p className="text-lg font-semibold text-foreground">Team not found</p>
        <Link href={`/dashboard/clubs/${clubId}/teams`} className="text-sm text-primary mt-3 inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to teams
        </Link>
      </div>
    );
  }

  const players = team.players ?? [];
  const positions = positionsForSport(team.sport);
  const total = team.wins + team.draws + team.losses;
  const winRate = total > 0 ? Math.round((team.wins / total) * 100) : 0;
  const existingIds = players.map((p) => p.userId);
  const availableCount = members.filter((m) => !existingIds.includes(memberUserId(m))).length;

  const persistPlayers = async (next: TeamPlayer[], extra: Partial<Team> = {}) => {
    const serialized = serializePlayers(next);
    await updateTeam(clubId, teamId, {
      players: serialized,
      memberCount: serialized.length,
      ...extra,
    });
  };

  const handleAddPlayer = async () => {
    if (!addUserId) { toast.error("Select a player to add."); return; }
    if (existingIds.includes(addUserId)) { toast.error("This player is already on the squad."); return; }

    const member = members.find((m) => memberUserId(m) === addUserId);
    if (!member) { toast.error("Member not found."); return; }

    setAdding(true);
    try {
      const player = memberToPlayer(member, {
        position: addPosition,
        jerseyNumber: addJersey ? Number(addJersey) : undefined,
      });
      await persistPlayers([...players, player]);
      toast.success(`${member.displayName} added to the squad.`);
      setAddUserId("");
      setAddJersey("");
    } catch (err) {
      console.error("Add player failed:", err);
      toast.error(firestoreErrorMessage(err, "Failed to add player."));
    } finally {
      setAdding(false);
    }
  };

  const handleSavePlayer = async (userId: string, patch: Partial<TeamPlayer>) => {
    setUpdating(userId);
    try {
      const next = players.map((p) => (p.userId === userId ? { ...p, ...patch } : p));
      await persistPlayers(next);
    } catch (err) {
      console.error("Update player failed:", err);
      toast.error(firestoreErrorMessage(err, "Failed to update player."));
    } finally {
      setUpdating(null);
    }
  };

  const handleRemovePlayer = async (player: TeamPlayer) => {
    if (player.userId === team.captainId) {
      toast.error("Assign a new captain before removing them.");
      return;
    }
    if (!confirm(`Remove ${player.displayName} from the squad?`)) return;
    setUpdating(player.userId);
    try {
      await persistPlayers(players.filter((p) => p.userId !== player.userId));
      toast.success("Player removed.");
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "Failed to remove player."));
    } finally {
      setUpdating(null);
    }
  };

  const handleMakeCaptain = async (player: TeamPlayer) => {
    const member = members.find((m) => memberUserId(m) === player.userId);
    if (!member) { toast.error("Member record not found."); return; }
    setUpdating(player.userId);
    try {
      const cap = captainPlayer(member, player.jerseyNumber ?? 1);
      const next = syncCaptainInRoster(players, team.captainId, cap);
      await persistPlayers(next, {
        captainId: cap.userId,
        captainName: cap.displayName,
        captainAvatarUrl: cap.avatarUrl,
      });
      setEditCaptain(cap.userId);
      toast.success(`${player.displayName} is now captain.`);
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "Failed to update captain."));
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!editName.trim()) { toast.error("Team name is required."); return; }
    if (!editCaptain) { toast.error("Captain is required."); return; }
    const captainMember = members.find((m) => memberUserId(m) === editCaptain);
    if (!captainMember) { toast.error("Selected captain not found."); return; }

    setSavingSettings(true);
    try {
      const cap = captainPlayer(
        captainMember,
        players.find((p) => p.userId === editCaptain)?.jerseyNumber ?? 1,
      );
      const nextPlayers = syncCaptainInRoster(players, team.captainId, cap);
      await updateTeam(clubId, teamId, {
        name: editName.trim(),
        sport: editSport,
        captainId: cap.userId,
        captainName: cap.displayName,
        captainAvatarUrl: cap.avatarUrl,
        players: serializePlayers(nextPlayers),
        memberCount: nextPlayers.length,
      });
      toast.success("Team settings saved.");
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "Failed to save settings."));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setLogoProgress(0);
    try {
      const url = await uploadTeamLogo(clubId, teamId, file, setLogoProgress);
      await updateTeam(clubId, teamId, { logoUrl: url });
      toast.success("Team logo updated.");
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "Logo upload failed."));
    } finally {
      setLogoProgress(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Delete "${team.name}" permanently? This cannot be undone.`)) return;
    try {
      await deleteTeam(clubId, teamId);
      toast.success("Team deleted.");
      router.push(`/dashboard/clubs/${clubId}/teams`);
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "Failed to delete team."));
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "squad", label: "Squad", icon: Users },
    { id: "formation", label: "Formation", icon: LayoutGrid },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/dashboard/clubs/${clubId}/teams`} className="hover:text-foreground transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Teams
        </Link>
        <ChevronRight className="w-3 h-3 opacity-40" />
        <span className="text-foreground font-medium truncate">{team.name}</span>
      </nav>

      {/* Hero */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative group shrink-0 self-start"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted shadow-inner">
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <span className="text-2xl font-bold text-primary">{initials(team.name)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-2xl">
                  {logoProgress != null ? (
                    <span className="text-xs font-bold text-white">{logoProgress}%</span>
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleLogoUpload(f);
                  e.target.value = "";
                }}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{team.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted border border-border text-muted-foreground">
                  {sportEmoji(team.sport)} {team.sport}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {players.length} squad members · Est. {formatDate(team.createdAt)}
                {total > 0 && ` · ${total} matches played`}
              </p>
              {team.captainName && (
                <div className="flex items-center gap-2.5 mt-3 p-2.5 rounded-xl bg-amber-400/5 border border-amber-400/20 w-fit">
                  <MemberAvatar name={team.captainName} avatarUrl={team.captainAvatarUrl} size="sm" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/80">Captain</p>
                    <p className="text-sm font-semibold text-foreground">{team.captainName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <StatPill label="Wins" value={team.wins} accent="text-win" />
              <StatPill label="Draws" value={team.draws} accent="text-draw" />
              <StatPill label="Losses" value={team.losses} accent="text-loss" />
              <StatPill label="Win %" value={`${winRate}%`} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border bg-muted/20">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition ${
                tab === id
                  ? "border-primary text-primary bg-card"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Squad tab ── */}
      {tab === "squad" && (
        <div className="space-y-4">
          {/* Add player panel */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Add to Squad</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {availableCount} club {availableCount === 1 ? "member" : "members"} available to add
                </p>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl bg-muted/40 border border-dashed border-border">
                No club members yet. Invite members to the club before building your squad.
              </p>
            ) : availableCount === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl bg-muted/40 border border-dashed border-border">
                All club members are already on this squad.
              </p>
            ) : (
              <div className="grid sm:grid-cols-[1fr_140px_100px_auto] gap-3 items-end">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Player
                  </label>
                  <MemberCombobox
                    members={members}
                    value={addUserId}
                    onChange={setAddUserId}
                    excludeIds={existingIds}
                    placeholder="Search by name or email…"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Position
                  </label>
                  <select
                    value={addPosition}
                    onChange={(e) => setAddPosition(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Jersey #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={addJersey}
                    onChange={(e) => setAddJersey(e.target.value)}
                    placeholder="—"
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddPlayer()}
                  disabled={adding || !addUserId}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 h-[42px]"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Roster table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Squad Roster</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage positions, jersey numbers, and roles</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {players.length} players
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-20">#</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Player</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Position</th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-16">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">No players on the squad yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Use the form above to add your first player</p>
                      </td>
                    </tr>
                  ) : (
                    players.map((p) => (
                      <RosterRow
                        key={p.userId}
                        player={p}
                        isCaptain={p.userId === team.captainId}
                        positions={positions}
                        busy={updating === p.userId}
                        onSave={(patch) => handleSavePlayer(p.userId, patch)}
                        onMakeCaptain={() => void handleMakeCaptain(p)}
                        onRemove={() => void handleRemovePlayer(p)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Formation tab ── */}
      {tab === "formation" && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-1">Formation View</h2>
            <p className="text-xs text-muted-foreground mb-5">Players placed by assigned position</p>
            <SquadChart players={players} sport={team.sport} captainId={team.captainId} />
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Position Breakdown</h2>
            </div>
            <div className="space-y-2">
              {positions.map((pos) => {
                const group = players.filter((p) => p.position === pos);
                return (
                  <div key={pos} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50">
                    <span className="text-sm font-medium text-foreground">{pos}</span>
                    <span className="text-sm font-bold score-digits text-primary">{group.length}</span>
                  </div>
                );
              })}
              {players.filter((p) => !p.position || !positions.includes(p.position)).length > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-400/5 border border-amber-400/20">
                  <span className="text-sm font-medium text-amber-600">Unassigned</span>
                  <span className="text-sm font-bold score-digits text-amber-600">
                    {players.filter((p) => !p.position || !positions.includes(p.position)).length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Team Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Update team details, captain, and sport</p>
          </div>

          <div className="p-6 space-y-6 max-w-xl">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Team Name <span className="text-primary">*</span>
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Sport</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SPORTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditSport(s)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-medium transition flex flex-col items-center gap-1 border ${
                      editSport === s
                        ? "bg-primary text-primary-foreground border-primary/50"
                        : "bg-muted text-muted-foreground border-transparent hover:border-border"
                    }`}
                  >
                    <span className="text-base leading-none">{sportEmoji(s)}</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Captain <span className="text-primary">*</span>
              </label>
              <MemberCombobox
                members={members}
                value={editCaptain}
                onChange={setEditCaptain}
                required
                placeholder="Search club members…"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              disabled={savingSettings || !editName.trim() || !editCaptain}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>

          <div className="px-6 py-5 border-t border-border bg-destructive/5">
            <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Permanently delete this team and all squad data.</p>
            <button
              type="button"
              onClick={() => void handleDeleteTeam()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
